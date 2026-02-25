import { Button } from "@/components/ui";
import { Text } from "@/lib/primitives";

type Props = {
  title: string;
  description: string;
  onConfirm: () => void;
  onBack: () => void;
};

export function PermissionPrompt({ title, description, onConfirm, onBack }: Props) {
  return (
    <>
      <Text className="text-foreground font-medium mb-2">{title}</Text>
      <Text className="text-muted-foreground text-sm mb-4">{description}</Text>
      <Button className="px-4 py-3" onPress={onConfirm}>Permitir câmera</Button>
      <Button variant="bordered" className="px-4 py-3 mt-3" onPress={onBack}>Voltar</Button>
    </>
  );
}
