package com.dutyfree.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Gemini Flash-Lite 기반 다국어 영수증 구조화(JSON) 응답 DTO
 * 6가지 필수 항목:
 * 1) date (YYYY-MM-DD)
 * 2) store_name (상점명)
 * 3) items (배열: name [한국어 번역], quantity [기본 1], price [숫자])
 * 4) tax (총 세금 금액, 숫자)
 * 5) total_amount (총 결제금액, 숫자)
 * 6) currency (통화 코드, 예: JPY, USD)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptParsingResponse {

    @JsonProperty("date")
    private String date; // YYYY-MM-DD

    @JsonProperty("store_name")
    private String storeName; // 상점명

    @JsonProperty("items")
    private List<ReceiptItemDto> items; // 구매 품목 목록

    @JsonProperty("tax")
    private Double tax; // 총 세금 금액

    @JsonProperty("total_amount")
    private Double totalAmount; // 총 결제금액

    @JsonProperty("currency")
    private String currency; // 통화 코드 (JPY, USD, EUR, KRW 등)
}
