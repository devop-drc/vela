import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import FuzzyText from "@/components/landing/fx/FuzzyText";

/** 404 — React Bits FuzzyText in the brand gradient over the dark canvas. */
const NotFound = () => {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-7 px-6 text-center" style={{ background: "#140A0E" }}>
      <FuzzyText
        fontSize="clamp(6rem, 24vw, 15rem)"
        fontWeight={700}
        fontFamily="'Clash Display', 'Satoshi', sans-serif"
        gradient={["#FACC15", "#FF2E4D", "#A31234"]}
        baseIntensity={0.16}
        hoverIntensity={0.5}
      >
        404
      </FuzzyText>
      <p className="text-lg text-white/60">{t("notfound.message")}</p>
      <Link
        to="/"
        className="rounded-full border-2 border-white/30 px-7 py-3 font-medium text-white transition-colors hover:border-white/60 hover:bg-white/10"
      >
        {t("notfound.return_home")}
      </Link>
    </div>
  );
};

export default NotFound;
