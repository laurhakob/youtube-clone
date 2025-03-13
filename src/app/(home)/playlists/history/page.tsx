import { DEFAULT_LIMIT } from "@/constans";
import { HistoryView } from "@/modules/playlists/ui/views/history-view";
import { HydrateClient, trpc } from "@/trpc/server";

const Page = async () => {
  void trpc.playlists.getHistory.prefetchInfinite({ limit: DEFAULT_LIMIT });
  return (
    <HydrateClient>
      <HistoryView />
    </HydrateClient>
  );
};

export default Page;
