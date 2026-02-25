import { TopBar } from "@/components/ui";

type Props = {
  title: string;
  subtitle?: string;
};

export function EventHeader({ title, subtitle }: Props) {
  return <TopBar title={title} subtitle={subtitle} />;
}
