//app/page.tsx

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center text-white font-sans">
      <h1 className="text-4xl lg:text-6xl font-black text-[#62c073] mb-4 uppercase tracking-tight">V5 Telecom</h1>
      <p className="text-zinc-400">A nossa nova página inicial está a chegar.</p>
      
      <a 
        href="/demo-cliente" 
        className="mt-8 bg-[#62c073] text-black font-bold py-3 px-6 rounded-lg uppercase tracking-wider text-sm transition-all hover:bg-white"
      >
        Aceder ao Teste de Cobertura ➔
      </a>
    </div>
  );
}