export const tokens = {
  color:{brand:"#E02B2B",brandSoft:"#FFF1F1",ink:"#17181A",muted:"#6F7378",background:"#F7F7F8",surface:"#FFFFFF",line:"#E9EAEC",success:"#19A463",warning:"#FFB020",info:"#3478F6"},
  radius:{control:12,card:14,largeCard:18,pill:999},
  spacing:{xs:4,sm:8,md:12,lg:16,xl:20,xxl:24},
} as const;
export type DesignTokens = typeof tokens;
