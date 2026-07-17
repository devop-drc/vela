// Mobile-first page presentation of the Vela assistant (desktop uses the
// floating popover; this route is linked from the mobile floating dock).

import { useEffect } from "react";
import { VelaChatPanel } from "@/components/VelaChat";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { useTranslation } from "react-i18next";

const ChatPage = () => {
  const { i18n } = useTranslation();
  const sq = i18n.language?.startsWith("sq");
  const { setTitle } = usePageTitle();
  useEffect(() => { setTitle(sq ? "Vela Asistenti" : "Vela Assistant"); }, [setTitle, sq]);

  return (
    <VelaChatPanel
      autoFocus={false}
      className="h-[calc(100dvh-13.5rem)] min-h-[420px] rounded-xl border md:h-[calc(100dvh-8rem)]"
    />
  );
};

export default ChatPage;
