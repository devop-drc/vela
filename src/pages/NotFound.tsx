import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const NotFound = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">{t("notfound.title")}</h1>
        <p className="text-xl text-muted-foreground mb-4">{t("notfound.message")}</p>
        <Link to="/" className="text-primary hover:underline">
          {t("notfound.return_home")}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;