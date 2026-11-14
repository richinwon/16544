package com.dutyfree.controller;

import com.dutyfree.dto.ReceiptParsingResponse;
import com.dutyfree.service.GeminiReceiptParserService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Base64;
import java.util.Map;

/**
 * 영수증 파싱 REST API 컨트롤러
 * 엔드포인트: POST /api/receipts/parse
 */
@RestController
@RequestMapping("/api/receipts")
@CrossOrigin(origins = "*")
public class ReceiptParserController {

    private final GeminiReceiptParserService parserService;

    public ReceiptParserController(GeminiReceiptParserService parserService) {
        this.parserService = parserService;
    }

    /**
     * Multipart 파일 업로드 방식 파싱
     */
    @PostMapping(value = "/parse", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ReceiptParsingResponse> parseReceiptFile(
            @RequestParam("file") MultipartFile file) throws IOException {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        byte[] bytes = file.getBytes();
        String contentType = file.getContentType() != null ? file.getContentType() : "image/jpeg";

        ReceiptParsingResponse response = parserService.parseReceipt(bytes, contentType);
        return ResponseEntity.ok(response);
    }

    /**
     * Base64 JSON 바디 방식 파싱
     */
    @PostMapping(value = "/parse-base64", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ReceiptParsingResponse> parseReceiptBase64(
            @RequestBody Map<String, String> request) throws IOException {

        String base64Data = request.get("image");
        if (base64Data == null || base64Data.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        String mimeType = "image/jpeg";
        if (base64Data.contains(",")) {
            String header = base64Data.substring(0, base64Data.indexOf(","));
            if (header.contains("image/png")) mimeType = "image/png";
            else if (header.contains("image/webp")) mimeType = "image/webp";
            base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
        }

        byte[] decodedBytes = Base64.getDecoder().decode(base64Data);
        ReceiptParsingResponse response = parserService.parseReceipt(decodedBytes, mimeType);
        return ResponseEntity.ok(response);
    }
}
