import { theme } from "antd";
import type { ThemeConfig } from "antd";

export const bimdColors = {
  black: "#000000",
  navy: "#001B5E",
  primary: "#0050FF",
  white: "#FFFFFF",
  cyan: "#06BFFF",
} as const;

export const bimdTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: bimdColors.primary,
    colorInfo: bimdColors.cyan,
    colorLink: bimdColors.primary,
    colorText: "#1F2933",
    colorTextHeading: "#102A43",
    colorTextSecondary: "#627D98",
    colorBgBase: bimdColors.white,
    colorBgLayout: "#F4F6F8",
    colorBorder: "#E5E7EB",
    borderRadius: 8,
    controlHeight: 40,
  },
  components: {
    Button: {
      borderRadius: 8,
      controlHeight: 40,
      fontWeight: 600,
      primaryShadow: "none",
    },
    Card: {
      borderRadiusLG: 8,
      paddingLG: 24,
    },
    Input: {
      borderRadius: 8,
      controlHeight: 40,
    },
    Layout: {
      bodyBg: "#F4F6F8",
      headerBg: bimdColors.white,
      siderBg: bimdColors.navy,
      triggerBg: bimdColors.navy,
    },
    Menu: {
      darkItemBg: bimdColors.navy,
      darkSubMenuItemBg: bimdColors.navy,
      darkItemSelectedBg: bimdColors.primary,
      darkItemHoverBg: "#003ECC",
    },
    Typography: {
      titleMarginBottom: 0,
      titleMarginTop: 0,
    },
  },
};

export const bimdDarkTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: bimdColors.primary,
    colorInfo: bimdColors.cyan,
    colorLink: bimdColors.primary,
    colorText: "#ECF0F3",
    colorTextHeading: "#FFFFFF",
    colorTextSecondary: "#9CA3AF",
    colorBgBase: "#111827",
    colorBgLayout: "#1F2937",
    colorBorder: "#374151",
    borderRadius: 8,
    controlHeight: 40,
  },
  components: {
    Button: {
      borderRadius: 8,
      controlHeight: 40,
      fontWeight: 600,
      primaryShadow: "none",
    },
    Card: {
      borderRadiusLG: 8,
      paddingLG: 24,
    },
    Input: {
      borderRadius: 8,
      controlHeight: 40,
    },
    Layout: {
      bodyBg: "#1F2937",
      headerBg: "#111827",
      siderBg: "#111827",
      triggerBg: "#111827",
    },
    Menu: {
      darkItemBg: "#111827",
      darkSubMenuItemBg: "#111827",
      darkItemSelectedBg: bimdColors.primary,
      darkItemHoverBg: "#1F2937",
    },
    Typography: {
      titleMarginBottom: 0,
      titleMarginTop: 0,
    },
  },
};
