import CanvasGame from "@/components/Game/CanvasGame";
import Link from "next/link";
import { paths } from "@/utils/paths";
import { LEVEL_IDS } from "@/utils/levels";
import type { Metadata } from "next";

export const dynamic = "error"; // SSG only

export async function generateStaticParams() {
  return LEVEL_IDS.map((id) => ({ levelId: id }));
}

export const metadata: Metadata = {
  title: "Zamboni - Play",
};

export default async function Page({ params }: { params: Promise<{ levelId: string }> }) {
  const { levelId } = await params;
  return (
    <div className="w-full h-full">
      <CanvasGame levelId={levelId} />
      {/* Exit button - bottom right, styled similar to bottom-left music control */}
      <div
        className="fixed right-2 bottom-2 z-50 bg-white/80 pixel-card px-2 py-1 font-pixel text-[12px] text-blue-900/90"
        style={{ userSelect: "none" }}
      >
        <div className="flex items-center gap-2">
          <Link
            href={paths.home}
            className="pixel-button px-2 py-0.5"
            aria-label="Exit to main menu"
          >
            Exit
          </Link>
        </div>
      </div>
    </div>
  );
}
