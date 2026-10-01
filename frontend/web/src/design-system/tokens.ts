export const tokens = {
  color:{brand:"#286BFF",brandSoft:"#E8F7FF",ink:"#08132F",muted:"#526585",background:"#F4F8FF",surface:"#FFFFFF",line:"#D9E5F5",success:"#19A463",warning:"#FFB020",info:"#00B8D9"},
  radius:{control:12,card:14,largeCard:18,pill:999},
  spacing:{xs:4,sm:8,md:12,lg:16,xl:20,xxl:24},
} as const;
export type DesignTokens = typeof tokens;
