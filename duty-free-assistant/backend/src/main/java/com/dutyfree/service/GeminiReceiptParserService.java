package com.dutyfree.service;

import com.dutyfree.dto.ReceiptItemDto;
import com.dutyfree.dto.ReceiptParsingResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.cloud.vertexai.VertexAI;
import com.google.cloud.vertexai.api.Content;
import com.google.cloud.vertexai.api.GenerateContentResponse;
import com.google.cloud.vertexai.api.GenerationConfig;
import com.google.cloud.vertexai.api.Part;
import com.google.cloud.vertexai.api.Schema;
import com.google.cloud.vertexai.api.Type;
import com.google.cloud.vertexai.generativeai.GenerativeModel;
import com.google.protobuf.ByteString;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Map;

/**
 * Google Cloud Vertex AI / Gemini 2.5 Flash-Lite 모델을 활용한
 * 다국어 영수증 이미지 구조화(JSON) 추출 서비스
 */
@Service
public class GeminiReceiptParserService {

    private static final Logger log = LoggerFactory.getLogger(GeminiReceiptParserService.class);
    private static final String MODEL_NAME = "gemini-2.5-flash-lite";

    private final String projectId;
    private final String location;
    private final ObjectMapper objectMapper;

    public GeminiReceiptParserService(
            @Value("${google.cloud.project-id:tax-secretary-4db36}") String projectId,
            @Value("${google.cloud.location:asia-northeast3}") String location,
            ObjectMapper objectMapper) {
        this.projectId = projectId;
        this.location = location;
        this.objectMapper = objectMapper;
    }

    /**
     * Gemini 2.5 Flash-Lite Structured Outputs (responseSchema & responseMimeType) 구성
     */
    public GenerationConfig buildStructuredGenerationConfig() {
        // 1. Item schema
        Schema itemSchema = Schema.newBuilder()
                .setType(Type.OBJECT)
                .putProperties("name", Schema.newBuilder()
                        .setType(Type.STRING)
                        .setDescription("품목명 (현지어가 일본어, 영어 등 외국어인 경우 자연스러운 한국어로 번역)")
                        .build())
                .putProperties("quantity", Schema.newBuilder()
                        .setType(Type.INTEGER)
                        .setDescription("품목 수량 (정수, 기본값 1)")
                        .build())
                .putProperties("price", Schema.newBuilder()
                        .setType(Type.NUMBER)
                        .setDescription("품목 단가 또는 금액 (현지 통화 숫자)")
                        .build())
                .addRequired("name")
                .addRequired("quantity")
                .addRequired("price")
                .build();

        // 2. Root receipt schema (6가지 필수 항목)
        Schema receiptSchema = Schema.newBuilder()
                .setType(Type.OBJECT)
                .putProperties("date", Schema.newBuilder()
                        .setType(Type.STRING)
                        .setDescription("영수증 구매 날짜 (YYYY-MM-DD 형식)")
                        .build())
                .putProperties("store_name", Schema.newBuilder()
                        .setType(Type.STRING)
                        .setDescription("영수증 상점명 / 가맹점명")
                        .build())
                .putProperties("items", Schema.newBuilder()
                        .setType(Type.ARRAY)
                        .setItems(itemSchema)
                        .setDescription("구매 품목 목록 배열")
                        .build())
                .putProperties("tax", Schema.newBuilder()
                        .setType(Type.NUMBER)
                        .setDescription("총 세금 금액 (소비세, 부가세, VAT 등 현지 통화 숫자)")
                        .build())
                .putProperties("total_amount", Schema.newBuilder()
                        .setType(Type.NUMBER)
                        .setDescription("총 결제금액 (현지 통화 숫자)")
                        .build())
                .putProperties("currency", Schema.newBuilder()
                        .setType(Type.STRING)
                        .setDescription("통화 코드 (예: JPY, USD, EUR, KRW, CNY, GBP 등)")
                        .build())
                .addRequired("date")
                .addRequired("store_name")
                .addRequired("items")
                .addRequired("tax")
                .addRequired("total_amount")
                .addRequired("currency")
                .build();

        return GenerationConfig.newBuilder()
                .setResponseMimeType("application/json")
                .setResponseSchema(receiptSchema)
                .setTemperature(0.1f) // 정밀한 정보 추출을 위해 낮은 temperature 적용
                .build();
    }

    /**
     * 영수증 이미지 바이트를 입력받아 Gemini 2.5 Flash-Lite 모델로 6개 필수 항목 파싱
     */
    public ReceiptParsingResponse parseReceipt(byte[] imageBytes, String mimeType) throws IOException {
        log.info("Starting Gemini 2.5 Flash-Lite receipt parsing (Image size: {} bytes, mime: {})",
                imageBytes.length, mimeType);

        try (VertexAI vertexAI = new VertexAI(projectId, location)) {
            GenerativeModel model = new GenerativeModel(MODEL_NAME, vertexAI)
                    .withGenerationConfig(buildStructuredGenerationConfig())
                    .withSystemInstruction(Content.newBuilder()
                            .addParts(Part.newBuilder()
                                    .setText("당신은 다국어 영수증 데이터 구조화 전문 AI입니다. " +
                                            "영수증 이미지에서 6가지 필수 항목(date, store_name, items, tax, total_amount, currency)을 " +
                                            "지정된 JSON 스키마에 맞춰 정확히 추출하세요. " +
                                            "외국어 품목명은 반드시 적절한 한국어로 번역하고, 수량이 명시되지 않은 경우 1로 설정하세요.")
                                    .build())
                            .build());

            ByteString imageByteString = ByteString.copyFrom(imageBytes);
            Part imagePart = Part.newBuilder()
                    .setInlineData(com.google.cloud.vertexai.api.Blob.newBuilder()
                            .setMimeType(mimeType != null ? mimeType : "image/jpeg")
                            .setData(imageByteString)
                            .build())
                    .build();

            Part promptPart = Part.newBuilder()
                    .setText("이 영수증의 구매일자(YYYY-MM-DD), 상점명, 구매품목들(한국어 번역, 수량, 금액), 총세금, 총결제액, 통화코드를 추출하여 JSON으로 반환하세요.")
                    .build();

            Content content = Content.newBuilder()
                    .addParts(imagePart)
                    .addParts(promptPart)
                    .build();

            GenerateContentResponse response = model.generateContent(content);
            String jsonOutput = response.getCandidates(0).getContent().getParts(0).getText();

            log.info("Gemini 2.5 Flash-Lite JSON output: {}", jsonOutput);

            ReceiptParsingResponse result = objectMapper.readValue(jsonOutput, ReceiptParsingResponse.class);
            return result;
        } catch (Exception e) {
            log.error("Failed to parse receipt with Gemini 2.5 Flash-Lite Vertex AI: {}", e.getMessage(), e);
            throw new IOException("영수증 이미지 AI 파싱 중 오류가 발생했습니다: " + e.getMessage(), e);
        }
    }
}
