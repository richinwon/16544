package com.dutyfree.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptItemDto {

    @JsonProperty("name")
    private String name; // 상품명 (현지어인 경우 한국어로 번역)

    @JsonProperty("quantity")
    @Builder.Default
    private Integer quantity = 1; // 수량 (정수, 기본 1)

    @JsonProperty("price")
    private Double price; // 가격 (숫자)
}
