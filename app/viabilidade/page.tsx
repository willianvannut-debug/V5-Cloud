// app/viabilidade/page.tsx
import { redirect } from 'next/navigation';

export default function ViabilidadeIndex() {
  // Se alguém entrar apenas em /viabilidade, joga automaticamente para a Matriz
  redirect('/viabilidade/v5-fibra-matriz');
}