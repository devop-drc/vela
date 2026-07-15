import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 8px)",
        sm: "calc(var(--radius) - 16px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", ...defaultTheme.fontFamily.sans],
        heading: ["var(--font-heading)", ...defaultTheme.fontFamily.sans],
      },
      boxShadow: {
        // Premium, soft & layered — faintly violet-tinted to match the brand,
        // so every card / dropdown / popover / button that uses the default
        // shadow scale reads as elevated glass rather than a hard drop shadow.
        xs: '0 1px 2px 0 rgba(46, 33, 64, 0.04)',
        sm: '0 1px 2px 0 rgba(46, 33, 64, 0.05), 0 1px 3px 0 rgba(46, 33, 64, 0.04)',
        DEFAULT: '0 2px 4px -1px rgba(46, 33, 64, 0.05), 0 4px 10px -2px rgba(46, 33, 64, 0.06)',
        md: '0 4px 8px -2px rgba(46, 33, 64, 0.06), 0 10px 24px -6px rgba(46, 33, 64, 0.08)',
        lg: '0 8px 16px -6px rgba(46, 33, 64, 0.07), 0 18px 40px -10px rgba(46, 33, 64, 0.10)',
        xl: '0 14px 28px -8px rgba(46, 33, 64, 0.10), 0 28px 60px -14px rgba(46, 33, 64, 0.12)',
        '2xl': '0 24px 56px -14px rgba(46, 33, 64, 0.16)',
        card: '0 1px 2px 0 rgba(46, 33, 64, 0.04), 0 6px 16px -8px rgba(46, 33, 64, 0.10)',
        premium: '0 24px 48px -18px rgba(46, 33, 64, 0.16), 0 8px 20px -12px rgba(46, 33, 64, 0.10)',
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "marquee": {
          from: { transform: "translateX(0)" },
          // Moves 50% of the animated element's width + half the gap.
          // This works when the animated element contains two copies of the content + one gap.
          to: { transform: "translateX(calc(-50% - var(--gap) / 2))" },
        },
        "marquee-vertical": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(calc(-50% - var(--gap) / 2))" },
        },
        "pulse-once": {
          "0%": { opacity: "0.6", transform: "scale(0.98)" },
          "50%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "marquee": "marquee var(--duration) linear infinite",
        "marquee-vertical": "marquee-vertical var(--duration) linear infinite",
        "pulse-once": "pulse-once 0.6s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;