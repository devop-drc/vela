// Mobile-first page presentation of notifications (desktop uses the floating
// bell popover; this route is linked from the mobile floating dock).

import { useEffect } from "react";
import NotificationSidebar from "@/components/layout/NotificationSidebar";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { useTranslation } from "react-i18next";

const NotificationsPage = () => {
  const { t } = useTranslation();
  const { setTitle } = usePageTitle();
  useEffect(() => { setTitle(t("notifications.title", "Notifications")); }, [setTitle, t]);

  return (
    <div className="h-[calc(100dvh-13.5rem)] min-h-[420px] md:h-[calc(100dvh-8rem)]">
      <NotificationSidebar asPage />
    </div>
  );
};

export default NotificationsPage;
