import { Input } from "@/components/ui";

export function SearchBar({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Input
      placeholder="Buscar por nome, CPF, data ou código do ticket"
      value={value}
      onChangeText={onChange}
      autoCapitalize="none"
      autoCorrect={false}
      className="mb-2"
    />
  );
}
