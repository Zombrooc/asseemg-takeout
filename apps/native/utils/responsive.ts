import { useWindowDimensions } from "react-native";

const BASE_WIDTH = 375;

/**
 * Hook para layout responsivo. Retorna escala baseada na largura da janela
 * (referência 375) e as dimensões atuais. Use scale(n) para padding, margin,
 * minHeight/minWidth e tamanhos; use width/height para % ou maxWidth.
 */
export function useResponsiveScale() {
  const { width, height } = useWindowDimensions();
  const scale = (size: number) => (width / BASE_WIDTH) * size;
  return { scale, width, height };
}
