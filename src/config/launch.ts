/**
 * Pre-launch switches for the public landing page.
 *
 * WAITLIST_MODE hides every signup/login entry point and routes all CTAs to
 * the #interest section, where visitors express interest by email. Flip to
 * `false` at production launch to restore the register/login flows —
 * nothing else needs to change.
 */
export const WAITLIST_MODE = true;

/** Where interest emails go while in waitlist mode. */
export const CONTACT_EMAIL = "darien.cepani42@gmail.com";
export const CONTACT_PHONE = "+355 68 480 6800";
export const CONTACT_PHONE_TEL = "+355684806800";

/** Smooth-scroll any CTA to the interest section. */
export const scrollToInterest = () =>
  document.getElementById("interest")?.scrollIntoView({ behavior: "smooth", block: "start" });

export const waitlistCtaLabel = (lang: "sq" | "en") =>
  lang === "sq" ? "Kontakto" : "Contact us";
