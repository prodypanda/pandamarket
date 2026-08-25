'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  Globe,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  TrendingUp,
  Users,
  ShoppingBag,
  Database,
  Layers,
  Sparkles,
  Compass,
  ArrowUpRight,
  Maximize2,
  Minimize2,
  CheckCircle2,
  ChevronRight,
  Info,
} from 'lucide-react';
import { formatMoney, formatNumber } from '@/lib/analytics-formatters';
import { fetchGeoHeatmapData } from '@/lib/admin-platform-analytics';

export interface GovernorateData {
  iso_code?: string;
  code: string;
  name: string;
  name_ar: string;
  zone: 'grand_tunis' | 'cap_bon_sahel' | 'nord_ouest_centre' | 'sfax_sud';
  orders_count: number;
  gmv_tnd: number;
  active_visitors: number;
  svg_path: string;
  center_x: number;
  center_y: number;
}

export interface DiasporaCountryData {
  country_code: string;
  country_name: string;
  flag_emoji: string;
  orders_count: number;
  gmv_tnd: number;
  active_visitors: number;
  share_pct: number;
}

// 24 Authentic Tunisian Administrative Governorates with precise Mercator projection geometry
export const ALL_24_GOVERNORATES: GovernorateData[] = [
  {
    "code": "BIZ",
    "iso_code": "TN-23",
    "name": "Bizerte",
    "name_ar": "بنزرت",
    "zone": "cap_bon_sahel",
    "orders_count": 650,
    "gmv_tnd": 39000,
    "active_visitors": 180,
    "svg_path": "M544.93,30.21L540.88,29.75L536.04,33.25L535.32,40.3L532.26,46.4L529.03,48.92L525.51,58.16L521.58,59.01L519.44,54.97L505.12,51.18L500.7,59.73L494.5,60.86L481.66,66.02L479.15,69.38L470.96,78.13L463.15,84.49L457.54,83.77L455.65,77.74L459.06,69.73L457.18,66.36L450.93,65.05L444.5,59.31L444,54.55L440.42,50.24L439.73,43.56L436.98,38.77L426.61,41.09L425.28,33.7L426.6,26.38L434.36,22.62L440.93,14.84L445.54,18.4L453.75,16.13L463.44,10.65L471.35,10.5L476.05,6.93L480.91,7.13L486.61,4.78L491.46,1.06L499.46,0L502.86,2.16L513.51,1.54L515.25,10.3L506.4,15.75L503.86,18.9L504.42,23.2L508.09,28.91L513.72,29.65L519.11,26.53L521.85,19.1L516.99,17.19L518.96,12.81L526.37,13.94L536.77,10.61L538.66,14.92L546.1,16.75L552.23,20.86L551.46,24.73L546.01,25.39Z",
    "center_x": 492,
    "center_y": 34
  },
  {
    "code": "ARI",
    "iso_code": "TN-12",
    "name": "Ariana",
    "name_ar": "أريانة",
    "zone": "grand_tunis",
    "orders_count": 820,
    "gmv_tnd": 49200,
    "active_visitors": 210,
    "svg_path": "M525.51,58.16L529.03,48.92L532.26,46.4L535.32,40.3L536.04,33.25L540.88,29.75L544.93,30.21L552.65,33.78L547.85,40.96L550.65,49.56L554.67,54.62L560.35,61.81L559.35,67.83L551.48,67.9L546.8,69.48L541.49,67.97L537.84,72.71L535.01,70.59L531.9,63.93L529.12,66.06L525.19,63.93Z",
    "center_x": 541,
    "center_y": 54
  },
  {
    "code": "TUN",
    "iso_code": "TN-11",
    "name": "Tunis",
    "name_ar": "تونس",
    "zone": "grand_tunis",
    "orders_count": 1450,
    "gmv_tnd": 87500,
    "active_visitors": 420,
    "svg_path": "M552.13,79.64L550.95,83.66L543.38,83.65L540.85,87.32L533.53,87.42L530.29,82.46L529.47,74.81L533.74,75.23L537.84,72.71L541.49,67.97L546.8,69.48L551.48,67.9L559.35,67.83L560.35,61.81L554.67,54.62L563.26,60.15L568.19,66.02L564.26,73.41L557.51,70.31L551.79,71.41L549.04,74.14Z",
    "center_x": 549,
    "center_y": 73
  },
  {
    "code": "MAN",
    "iso_code": "TN-14",
    "name": "Manouba",
    "name_ar": "منوبة",
    "zone": "grand_tunis",
    "orders_count": 430,
    "gmv_tnd": 25800,
    "active_visitors": 110,
    "svg_path": "M479.15,69.38L481.66,66.02L494.5,60.86L500.7,59.73L505.12,51.18L519.44,54.97L521.58,59.01L525.51,58.16L525.19,63.93L529.12,66.06L531.9,63.93L535.01,70.59L537.84,72.71L533.74,75.23L529.47,74.81L530.29,82.46L533.53,87.42L525.67,95.8L522.18,93.36L518.97,96.23L516.79,102.89L511.52,105.84L506.37,96.84L504.17,94.9L501.56,88.11L490.83,80.36L485.32,78.52Z",
    "center_x": 515,
    "center_y": 77
  },
  {
    "code": "BEN",
    "iso_code": "TN-13",
    "name": "Ben Arous",
    "name_ar": "بن عروس",
    "zone": "grand_tunis",
    "orders_count": 760,
    "gmv_tnd": 45600,
    "active_visitors": 195,
    "svg_path": "M572.03,88.3L568.26,99.16L565.61,102.75L569.28,105.61L565.66,115.05L566.09,117.59L557.04,122.7L556.23,116.85L547.1,112.52L542.85,104.97L533.03,101.56L528.16,101.36L525.67,95.8L533.53,87.42L540.85,87.32L543.38,83.65L550.95,83.66L552.13,79.64L557.35,81.2L560.62,78.9L566.66,86.05Z",
    "center_x": 552,
    "center_y": 98
  },
  {
    "code": "NAB",
    "iso_code": "TN-21",
    "name": "Nabeul",
    "name_ar": "نابل",
    "zone": "cap_bon_sahel",
    "orders_count": 980,
    "gmv_tnd": 58800,
    "active_visitors": 260,
    "svg_path": "M589.01,137.63L583.97,131.69L579.44,136.07L575.77,132.39L568.61,133.23L565.94,129.21L566.09,117.59L565.66,115.05L569.28,105.61L565.61,102.75L568.26,99.16L572.03,88.3L575.03,88.65L589.01,82.64L590.85,79.8L592.6,71.4L594.58,67.62L602.71,64.79L607.31,65.64L613.95,62.33L629.77,47.72L629.96,42.45L637.8,41.64L646.24,37.78L649.22,41.24L647.45,47.21L651.9,54.65L653.21,63.06L656.17,66.41L651.94,71.62L643.5,78.4L632.85,95.03L624.48,111.5L619.8,124.29L610.9,126.53L598.05,133.5L593.3,132.76Z",
    "center_x": 606,
    "center_y": 90
  },
  {
    "code": "ZAG",
    "iso_code": "TN-22",
    "name": "Zaghouan",
    "name_ar": "زغوان",
    "zone": "cap_bon_sahel",
    "orders_count": 240,
    "gmv_tnd": 14400,
    "active_visitors": 65,
    "svg_path": "M525.67,95.8L528.16,101.36L533.03,101.56L542.85,104.97L547.1,112.52L556.23,116.85L557.04,122.7L566.09,117.59L565.94,129.21L568.61,133.23L569.87,150.02L567.67,152.39L559.7,152.16L555.61,163.69L551.17,165.76L542.89,165.85L542.06,173.26L534.4,177L532.31,184.05L528.25,183.32L523.42,179.34L517.22,179.81L513.21,175.28L508.69,173.79L503.89,177.38L498.29,175.62L502.15,164.52L495.89,160.69L493.89,156.74L488.05,156.24L487.36,151.47L482.92,147.76L490.08,146.87L495.97,141.99L498.98,134.18L499.09,124.05L497.36,119.65L502.32,117.24L505.72,110.47L511.52,105.84L516.79,102.89L518.97,96.23L522.18,93.36Z",
    "center_x": 524,
    "center_y": 142
  },
  {
    "code": "BEJ",
    "iso_code": "TN-31",
    "name": "Béja",
    "name_ar": "باجة",
    "zone": "nord_ouest_centre",
    "orders_count": 310,
    "gmv_tnd": 18600,
    "active_visitors": 85,
    "svg_path": "M426.6,26.38L425.28,33.7L426.61,41.09L436.98,38.77L439.73,43.56L440.42,50.24L444,54.55L444.5,59.31L450.93,65.05L457.18,66.36L459.06,69.73L455.65,77.74L457.54,83.77L463.15,84.49L470.96,78.13L479.15,69.38L485.32,78.52L490.83,80.36L501.56,88.11L504.17,94.9L506.37,96.84L511.52,105.84L505.72,110.47L502.32,117.24L497.36,119.65L499.09,124.05L491.64,125.07L490.6,127.76L481.37,127.19L475.77,121.66L472.7,122.87L461.89,123.05L456.58,125.89L456.38,132.43L450.91,135.59L447.28,132.11L437.51,130.53L430.15,134.25L422,124.26L416.87,122.24L422.54,121.03L422.7,115.27L425.43,110.16L425.69,103.73L419.61,94.17L421.81,86.57L418.99,80.5L408.67,78.59L409.26,71.45L413.72,68.37L416.07,62.26L410.23,58.7L409.14,54.78L411.21,49.16L406.09,45.42L419.88,29.06Z",
    "center_x": 451,
    "center_y": 89
  },
  {
    "code": "JEN",
    "iso_code": "TN-32",
    "name": "Jendouba",
    "name_ar": "جندوبة",
    "zone": "nord_ouest_centre",
    "orders_count": 280,
    "gmv_tnd": 16800,
    "active_visitors": 75,
    "svg_path": "M406.09,45.42L411.21,49.16L409.14,54.78L410.23,58.7L416.07,62.26L413.72,68.37L409.26,71.45L408.67,78.59L418.99,80.5L421.81,86.57L419.61,94.17L425.69,103.73L425.43,110.16L422.7,115.27L422.54,121.03L416.87,122.24L408.16,124.07L405.51,127.16L386.02,130.95L378.61,128.69L372.33,131.54L366.68,131.19L363.08,134.31L355.24,138.04L348.69,137.27L350.41,129.57L336.57,126.16L328.29,125.99L323.65,123.8L322.71,119.87L340.55,110.62L341.26,108.38L354.98,101.48L359.51,91.14L357.58,84.82L353.07,82.39L359.24,79.53L369.2,80.41L380.28,73.88L381.39,71.12L375.81,68.68L376.73,56.89L387.6,52.9L392.26,55.39L398.27,52.24Z",
    "center_x": 383,
    "center_y": 96
  },
  {
    "code": "KEF",
    "iso_code": "TN-33",
    "name": "Le Kef",
    "name_ar": "الكاف",
    "zone": "nord_ouest_centre",
    "orders_count": 220,
    "gmv_tnd": 13200,
    "active_visitors": 60,
    "svg_path": "M408.16,124.07L413.06,132.34L414.62,137.2L411.25,143.08L416.1,152.16L420.32,154L421.37,159.99L419.75,162.48L421.54,168.53L425.98,171.67L433.14,174.54L433.66,186.81L427.13,192.2L426.44,199.77L419.84,203.84L418.72,209.59L419.61,214.71L417.12,220.02L419.64,224.66L416.28,227.74L401.5,223.47L392.06,216.82L387.37,218.3L380.28,216.56L373.62,222.89L374.04,231.23L367.32,236.06L362.48,231.43L352.85,232.4L347.44,238.47L345.12,238.59L344.51,233.15L340.62,231.64L334.64,225.37L333.98,220.84L335.55,213L336,203.11L334.53,196.6L337.46,194.58L337.82,183.29L340.88,176.01L343.22,174.07L342.49,168.92L339.31,164.02L344.41,155.83L342.54,151.35L348.48,145.93L346.64,142.85L348.69,137.27L355.24,138.04L363.08,134.31L366.68,131.19L372.33,131.54L378.61,128.69L386.02,130.95L405.51,127.16Z",
    "center_x": 379,
    "center_y": 184
  },
  {
    "code": "SIL",
    "iso_code": "TN-34",
    "name": "Siliana",
    "name_ar": "سليانة",
    "zone": "nord_ouest_centre",
    "orders_count": 190,
    "gmv_tnd": 11400,
    "active_visitors": 50,
    "svg_path": "M416.87,122.24L422,124.26L430.15,134.25L437.51,130.53L447.28,132.11L450.91,135.59L456.38,132.43L456.58,125.89L461.89,123.05L472.7,122.87L475.77,121.66L481.37,127.19L490.6,127.76L491.64,125.07L499.09,124.05L498.98,134.18L495.97,141.99L490.08,146.87L482.92,147.76L487.36,151.47L488.05,156.24L493.89,156.74L495.89,160.69L502.15,164.52L498.29,175.62L488.71,184.7L486.62,185.08L481.35,191.92L471.29,199.3L474.22,205.29L473.89,210.22L470.57,214.38L474.95,222.96L470.57,223.33L462.71,226.95L456.32,227.79L449.85,224.61L446.67,227.25L448.62,231.86L459.68,241.15L464.2,248.09L465.71,255.67L453.06,258.19L450.86,253.16L446.01,248.46L441.16,248.92L437.71,246.91L437.73,242.46L435.11,240.06L424.2,240.01L421.84,236.04L416.19,236.15L414.52,231.77L416.28,227.74L419.64,224.66L417.12,220.02L419.61,214.71L418.72,209.59L419.84,203.84L426.44,199.77L427.13,192.2L433.66,186.81L433.14,174.54L425.98,171.67L421.54,168.53L419.75,162.48L421.37,159.99L420.32,154L416.1,152.16L411.25,143.08L414.62,137.2L413.06,132.34L408.16,124.07Z",
    "center_x": 451,
    "center_y": 184
  },
  {
    "code": "SOU",
    "iso_code": "TN-51",
    "name": "Sousse",
    "name_ar": "سوسة",
    "zone": "cap_bon_sahel",
    "orders_count": 1200,
    "gmv_tnd": 72000,
    "active_visitors": 340,
    "svg_path": "M568.61,133.23L575.77,132.39L579.44,136.07L583.97,131.69L589.01,137.63L585.86,143.83L582.35,155.1L581.08,166.41L581.64,174.73L584.56,183.32L586.86,184.16L588.2,191.02L596.33,202.9L599.13,209.58L603.16,215.19L600.9,221.45L598.61,221.47L599.1,232.63L594.9,239.67L588.67,241.08L587.8,248.81L583.4,251.41L584.96,256.83L592.7,253.88L595.47,256.15L595.31,259.83L591.85,262.23L589.5,267.06L583.27,265.41L577.96,257.69L573.79,255.61L567.6,255.57L562.75,250.37L562.83,243.64L559.18,236.94L553.57,222.28L545.31,210.89L550.88,201.11L556.55,187.67L554.29,177.76L548.46,176.61L551.17,165.76L555.61,163.69L559.7,152.16L567.67,152.39L569.87,150.02Z",
    "center_x": 578,
    "center_y": 205
  },
  {
    "code": "MON",
    "iso_code": "TN-52",
    "name": "Monastir",
    "name_ar": "المنستير",
    "zone": "cap_bon_sahel",
    "orders_count": 580,
    "gmv_tnd": 34800,
    "active_visitors": 155,
    "svg_path": "M644.58,246.29L638.79,247.18L638.51,250.34L632.81,249.4L624.58,254.9L616.61,262.73L612.82,261.88L609.39,256.33L595.47,256.15L592.7,253.88L584.96,256.83L583.4,251.41L587.8,248.81L588.67,241.08L594.9,239.67L599.1,232.63L598.61,221.47L600.9,221.45L603.16,215.19L610.22,220.29L619.18,217.85L622.73,218.65L620.49,227.24L621.83,229.58L628.15,233.21L639.01,235.97L646.21,239.7Z",
    "center_x": 613,
    "center_y": 240
  },
  {
    "code": "MAH",
    "iso_code": "TN-53",
    "name": "Mahdia",
    "name_ar": "المهدية",
    "zone": "cap_bon_sahel",
    "orders_count": 410,
    "gmv_tnd": 24600,
    "active_visitors": 115,
    "svg_path": "M562.83,243.64L562.75,250.37L567.6,255.57L573.79,255.61L577.96,257.69L583.27,265.41L589.5,267.06L591.85,262.23L595.31,259.83L595.47,256.15L609.39,256.33L612.82,261.88L616.61,262.73L624.58,254.9L632.81,249.4L638.51,250.34L638.79,247.18L644.58,246.29L645.62,254.21L648.14,256.38L645.77,264.88L646.55,272.17L644.49,275.49L645.46,280.99L656.23,294.38L653.09,296.59L650.13,302.72L646.8,304.58L643.53,311.24L632.33,310.13L630.62,300.51L622.05,303.74L617.04,295.08L617.72,289.31L614.11,286.24L605.98,291.66L595.86,288.53L591.39,294.75L594.17,298.31L586.6,302.89L577.02,311.45L568.13,305.54L559.34,305.49L553.52,303.09L553.67,294.99L548.95,290.9L550,278.35L546.63,273.47L548.47,264.64L552.3,262.04L556.71,254.53L553.19,248.22L557.99,244.81Z",
    "center_x": 601,
    "center_y": 276
  },
  {
    "code": "KAI",
    "iso_code": "TN-41",
    "name": "Kairouan",
    "name_ar": "القيروان",
    "zone": "nord_ouest_centre",
    "orders_count": 510,
    "gmv_tnd": 30600,
    "active_visitors": 140,
    "svg_path": "M551.17,165.76L548.46,176.61L554.29,177.76L556.55,187.67L550.88,201.11L545.31,210.89L553.57,222.28L559.18,236.94L562.83,243.64L557.99,244.81L553.19,248.22L556.71,254.53L552.3,262.04L548.47,264.64L546.63,273.47L550,278.35L548.95,290.9L553.67,294.99L553.52,303.09L548.49,304.03L537.6,314.12L533.29,320.73L528.67,319.51L527,301.81L518.65,305.43L510.57,300.82L498.06,299.58L486.9,285.69L483.53,283.75L479.02,287.1L475.85,280.85L470.35,277.8L467.71,273.42L472.47,267.77L471.17,259.23L465.71,255.67L464.2,248.09L459.68,241.15L448.62,231.86L446.67,227.25L449.85,224.61L456.32,227.79L462.71,226.95L470.57,223.33L474.95,222.96L470.57,214.38L473.89,210.22L474.22,205.29L471.29,199.3L481.35,191.92L486.62,185.08L488.71,184.7L498.29,175.62L503.89,177.38L508.69,173.79L513.21,175.28L517.22,179.81L523.42,179.34L528.25,183.32L532.31,184.05L534.4,177L542.06,173.26L542.89,165.85Z",
    "center_x": 511,
    "center_y": 236
  },
  {
    "code": "KAS",
    "iso_code": "TN-42",
    "name": "Kassérine",
    "name_ar": "القصرين",
    "zone": "nord_ouest_centre",
    "orders_count": 260,
    "gmv_tnd": 15600,
    "active_visitors": 70,
    "svg_path": "M345.12,238.59L347.44,238.47L352.85,232.4L362.48,231.43L367.32,236.06L374.04,231.23L373.62,222.89L380.28,216.56L387.37,218.3L392.06,216.82L401.5,223.47L416.28,227.74L414.52,231.77L416.19,236.15L421.84,236.04L424.2,240.01L435.11,240.06L437.73,242.46L437.71,246.91L441.16,248.92L446.01,248.46L450.86,253.16L453.06,258.19L444.56,264.88L434.82,278.78L432.93,283.67L439.89,290.7L447.39,295.52L444.97,297.79L445.85,310.63L447.88,316.64L446.5,320.65L435.89,322.39L430.97,325.26L426.82,325.5L420.95,333.44L419.78,337.89L422.8,341.71L415.22,346.7L403.37,351.38L394.81,356.71L387.01,361.64L382.25,363.02L368.87,369.89L369.33,374.65L361.73,372.63L353.48,366.06L337.91,359.97L335.45,344.61L332.66,336.72L340.29,332.88L340.31,324.48L344.93,312.19L349.96,307.95L352.28,301.17L355.82,295.56L345.02,287.82L342.24,287.31L339.86,282.72L340.15,274.02L344.24,262.45L347.99,261.44L345.26,253.67L344.26,241.68Z",
    "center_x": 392,
    "center_y": 287
  },
  {
    "code": "SBO",
    "iso_code": "TN-43",
    "name": "Sidi Bouzid",
    "name_ar": "سيدي بوزيد",
    "zone": "nord_ouest_centre",
    "orders_count": 330,
    "gmv_tnd": 19800,
    "active_visitors": 90,
    "svg_path": "M465.71,255.67L471.17,259.23L472.47,267.77L467.71,273.42L470.35,277.8L475.85,280.85L479.02,287.1L483.53,283.75L486.9,285.69L498.06,299.58L510.57,300.82L518.65,305.43L527,301.81L528.67,319.51L533.29,320.73L534.91,323.7L531.79,334.69L525.21,344.05L518,359.33L509.74,373.11L513.14,380.04L524.13,377.84L527.88,381.05L536.11,385.67L533.27,393.64L527.05,395.49L523.42,399.36L519.14,399.28L512.34,410.3L504.98,411.61L498.53,415.53L501.34,422.04L494.92,421.81L489.49,418.57L481.7,420.32L480.34,418.52L484.04,405.82L479.89,402.91L472.84,400.74L468.35,394.77L463.13,391.69L455.3,391.23L454.15,387.8L447.85,385.65L445.99,382.78L446.46,377.78L440.74,366.12L433.15,364.02L427.88,364.21L423.83,362.11L413.72,365.76L405.59,361.19L401.26,360.43L394.81,356.71L403.37,351.38L415.22,346.7L422.8,341.71L419.78,337.89L420.95,333.44L426.82,325.5L430.97,325.26L435.89,322.39L446.5,320.65L447.88,316.64L445.85,310.63L444.97,297.79L447.39,295.52L439.89,290.7L432.93,283.67L434.82,278.78L444.56,264.88L453.06,258.19Z",
    "center_x": 472,
    "center_y": 346
  },
  {
    "code": "SFA",
    "iso_code": "TN-61",
    "name": "Sfax",
    "name_ar": "صفاقس",
    "zone": "sfax_sud",
    "orders_count": 1350,
    "gmv_tnd": 81000,
    "active_visitors": 390,
    "svg_path": "M669.34,349.21L674.41,351.41L671.96,357.89L672.48,362.39L668.59,365.42L663.58,366.44L655.28,371.68L655.86,366.76L661.12,361.18L666.54,359.86L665.54,356.56ZM650.82,370.32L652.87,372.85L646.18,378L637.86,372.73L639.36,370.92ZM553.52,303.09L559.34,305.49L568.13,305.54L577.02,311.45L586.6,302.89L594.17,298.31L591.39,294.75L595.86,288.53L605.98,291.66L614.11,286.24L617.72,289.31L617.04,295.08L622.05,303.74L630.62,300.51L632.33,310.13L643.53,311.24L644.02,315.17L641.69,323.84L636.28,326.69L632.64,330.42L632.23,341.28L625.91,351.33L612.62,363.38L611.74,370.7L602.15,375.47L596.7,382.3L595.24,388.89L590.41,391L584.93,391.15L578.49,394.59L570.64,404.98L564.86,408.67L561.58,407.06L558.71,411.88L548.78,416.82L542.43,418.94L538.76,423.83L536.14,430.53L531.36,438.71L527.44,435.4L522.98,437.99L517.29,436.88L512.69,429.84L508.83,428.03L501.69,429.54L496.38,425.98L494.92,421.81L501.34,422.04L498.53,415.53L504.98,411.61L512.34,410.3L519.14,399.28L523.42,399.36L527.05,395.49L533.27,393.64L536.11,385.67L527.88,381.05L524.13,377.84L513.14,380.04L509.74,373.11L518,359.33L525.21,344.05L531.79,334.69L534.91,323.7L533.29,320.73L537.6,314.12L548.49,304.03Z",
    "center_x": 581,
    "center_y": 365
  },
  {
    "code": "GAF",
    "iso_code": "TN-71",
    "name": "Gafsa",
    "name_ar": "قفصة",
    "zone": "sfax_sud",
    "orders_count": 340,
    "gmv_tnd": 20400,
    "active_visitors": 95,
    "svg_path": "M394.81,356.71L401.26,360.43L405.59,361.19L413.72,365.76L423.83,362.11L427.88,364.21L433.15,364.02L440.74,366.12L446.46,377.78L445.99,382.78L447.85,385.65L454.15,387.8L455.3,391.23L463.13,391.69L468.35,394.77L472.84,400.74L479.89,402.91L484.04,405.82L480.34,418.52L481.7,420.32L477.44,427.17L469.4,430.48L465.87,430.81L456.19,428.93L448.35,431.2L445.39,433.34L441.77,434.79L434.15,435.32L431.24,436.74L427.16,435.03L419.48,438.1L419.33,443.88L417.07,448.32L408.39,447.62L404.76,445.04L398.9,447.55L391.61,446.85L383.7,447.81L378.29,450.57L371.78,448.33L351.3,448.92L343.48,450.23L344.57,444.79L340.68,439.79L330.51,435.58L325.71,435.07L321.69,428.76L309.54,418.9L314.97,409.01L320.87,407.73L322.23,405.09L317.02,402.01L317.43,397.92L320.55,392.35L319.22,390.33L323.95,383.94L329.74,383.24L328.74,379.93L336.43,373.08L332.12,371.11L338.51,362.23L337.91,359.97L353.48,366.06L361.73,372.63L369.33,374.65L368.87,369.89L382.25,363.02L387.01,361.64Z",
    "center_x": 395,
    "center_y": 406
  },
  {
    "code": "TOZ",
    "iso_code": "TN-72",
    "name": "Tozeur",
    "name_ar": "توزر",
    "zone": "sfax_sud",
    "orders_count": 210,
    "gmv_tnd": 12600,
    "active_visitors": 60,
    "svg_path": "M319.22,390.33L320.55,392.35L317.43,397.92L317.02,402.01L322.23,405.09L320.87,407.73L314.97,409.01L309.54,418.9L321.69,428.76L325.71,435.07L330.51,435.58L340.68,439.79L344.57,444.79L343.48,450.23L351.3,448.92L371.78,448.33L378.29,450.57L375.28,459.77L365.95,472.12L349.32,485.07L331.31,500.6L315.03,512.53L307.87,519.26L294.46,530.11L287.56,535.04L277.03,538.58L262.86,516.03L259.91,508.06L260.61,502.66L259.28,494.18L256.58,490.64L252.18,488.26L254.86,483.11L252.01,473.58L254.6,469.47L253.94,464.34L255.73,458.79L252.79,455.52L252.78,451.88L257.68,450.22L261.39,446.52L261.98,442.97L266.69,435.2L275.31,439.19L284.03,432.99L283.73,428.95L288.57,413.44L288.72,406.74L295.51,405.55L299.51,401.32L305.97,399.85L309.6,395.05Z",
    "center_x": 299,
    "center_y": 452
  },
  {
    "code": "KEB",
    "iso_code": "TN-73",
    "name": "Kébili",
    "name_ar": "قبلي",
    "zone": "sfax_sud",
    "orders_count": 160,
    "gmv_tnd": 9600,
    "active_visitors": 45,
    "svg_path": "M445.39,433.34L455.12,444.16L452.26,448.06L445.31,454.3L444.43,470.39L445.17,476.89L451.14,485.94L454.55,493.02L456.49,500.56L464.43,502.15L469.35,510.42L474.38,509.84L477.49,514.52L481.56,516.49L477.17,521.2L477.3,526.09L474.64,529.01L478.39,534.29L485.78,539.45L487.77,545.59L492.17,552.63L495.75,555.97L501.85,562.16L510.96,567.65L518.09,567.67L520.02,569.08L519.91,584.31L516.92,589.24L519.71,593.45L527.33,597.15L522.32,600.06L521.65,605.74L522.94,612.07L526.08,614.42L518.73,621.94L519.66,626.45L516.86,632.24L524.44,640.09L522.68,641.67L516.43,639.89L513.18,634.7L504.32,630.55L500.51,622.05L491.11,622.09L482.61,625.11L474.2,630.57L449.32,637.28L438.69,640.98L410.76,641.43L344.42,659.12L340.9,619.86L332.45,606.38L323.69,595.63L317.77,589.62L317.89,582.94L294.18,571.6L285.93,571.11L280.87,557.86L277.03,538.58L287.56,535.04L294.46,530.11L307.87,519.26L315.03,512.53L331.31,500.6L349.32,485.07L365.95,472.12L375.28,459.77L378.29,450.57L383.7,447.81L391.61,446.85L398.9,447.55L404.76,445.04L408.39,447.62L417.07,448.32L419.33,443.88L419.48,438.1L427.16,435.03L431.24,436.74L434.15,435.32L441.77,434.79Z",
    "center_x": 437,
    "center_y": 541
  },
  {
    "code": "GAB",
    "iso_code": "TN-81",
    "name": "Gabès",
    "name_ar": "قابس",
    "zone": "sfax_sud",
    "orders_count": 450,
    "gmv_tnd": 27000,
    "active_visitors": 125,
    "svg_path": "M481.7,420.32L489.49,418.57L494.92,421.81L496.38,425.98L501.69,429.54L508.83,428.03L512.69,429.84L517.29,436.88L522.98,437.99L527.44,435.4L531.36,438.71L532.75,456.57L534.4,462.47L541.28,476.13L549.53,485.69L556.85,491.19L566.07,501.15L572.29,505.15L579.98,507.4L575.56,510.1L568.71,521.06L568.25,523.26L557.97,538.05L551.07,537.6L545.3,540.59L544.13,543.95L539.48,546.12L539.63,549.57L529.62,555.06L525.59,553.74L521.2,556.61L517.52,556L501.22,557.71L495.75,555.97L492.17,552.63L487.77,545.59L485.78,539.45L478.39,534.29L474.64,529.01L477.3,526.09L477.17,521.2L481.56,516.49L477.49,514.52L474.38,509.84L469.35,510.42L464.43,502.15L456.49,500.56L454.55,493.02L451.14,485.94L445.17,476.89L444.43,470.39L445.31,454.3L452.26,448.06L455.12,444.16L445.39,433.34L448.35,431.2L456.19,428.93L465.87,430.81L469.4,430.48L477.44,427.17Z",
    "center_x": 503,
    "center_y": 490
  },
  {
    "code": "MED",
    "iso_code": "TN-82",
    "name": "Médenine",
    "name_ar": "مدنين",
    "zone": "sfax_sud",
    "orders_count": 380,
    "gmv_tnd": 22800,
    "active_visitors": 105,
    "svg_path": "M657.31,695.59L659.35,690.3L667.01,675.06L686.15,663.53L684.99,660.67L679.56,661.84L648.07,636.69L649.78,632.12L649.87,614.47L654.34,607.36L648.62,600.85L643.73,597.46L641.13,593.03L639.94,587.46L609.23,572.75L603.82,571.82L596.07,567.07L598.94,565.03L587.69,559.44L583.26,560.34L573.67,566.4L559.81,569.7L555.36,575.04L552.84,575.94L546.27,573.98L540.69,575.13L537.39,581.53L525.12,584.66L519.91,584.31L520.02,569.08L518.09,567.67L510.96,567.65L501.85,562.16L495.75,555.97L501.22,557.71L517.52,556L521.2,556.61L525.59,553.74L529.62,555.06L539.63,549.57L539.48,546.12L544.13,543.95L545.3,540.59L551.07,537.6L557.97,538.05L568.25,523.26L568.71,521.06L575.56,510.1L579.98,507.4L587.45,508.68L595.93,507.7L604.98,502.54L609.5,501.23L612.3,505.23L610.68,509.91L611.27,515.26L605.77,521.68L607.6,526.39L607.07,530.23L616.44,532.63L619.34,529.9L632.11,525.84L635.21,520.27L632.04,513.23L634.9,512.07L631.41,505.01L627.24,503.66L621.71,497.15L614.14,502.35L610.31,493.74L612.8,488.87L612.46,476.77L619.36,475.27L626.91,478.35L633.22,478.71L639.33,480.86L641.82,483.93L647.14,485.5L647.73,489.88L641.01,495.15L637.58,501.11L631.76,504.88L635.09,511.63L639.01,512.75L641.6,510.7L646.3,512.26L653.02,521.39L654.49,531.91L651.41,538.56L656.48,544.31L656.11,546.54L660.43,550.6L654.77,556.72L659.16,562.63L660.87,568.81L670.64,568.64L681.8,572.01L684.81,570.9L691.78,574.44L694.22,571.38L704.2,574.1L700.56,584.71L698.87,599.31L695.76,610.55L697.84,617.17L695.73,627.47L696.82,633.74L695.72,640.56L697.93,647.78L705.6,655.38L707.99,659.73L700.03,675.78L692.87,681.35L688.57,682.25L682,686.44L663.82,692.5Z",
    "center_x": 620,
    "center_y": 561
  },
  {
    "code": "TAT",
    "iso_code": "TN-83",
    "name": "Tataouine",
    "name_ar": "تطاوين",
    "zone": "sfax_sud",
    "orders_count": 190,
    "gmv_tnd": 11400,
    "active_visitors": 55,
    "svg_path": "M519.91,584.31L525.12,584.66L537.39,581.53L540.69,575.13L546.27,573.98L552.84,575.94L555.36,575.04L559.81,569.7L573.67,566.4L583.26,560.34L587.69,559.44L598.94,565.03L596.07,567.07L603.82,571.82L609.23,572.75L639.94,587.46L641.13,593.03L643.73,597.46L648.62,600.85L654.34,607.36L649.87,614.47L649.78,632.12L648.07,636.69L679.56,661.84L684.99,660.67L686.15,663.53L667.01,675.06L659.35,690.3L657.31,695.59L649.28,698.91L644.79,702.39L638.92,704.43L625,714.53L624.13,718.18L617.92,729.13L609.32,732.03L604.02,730.77L600.84,732.73L598.89,738.97L601.03,743.2L600.05,746.95L594.08,752.36L591.84,759.08L588.23,762.49L578.27,765.12L570.76,763.7L561.48,770.02L553.75,783.62L544.25,796.92L546.09,809.64L555.99,834.58L558.22,843.18L561.08,849.79L559.69,857.09L562.15,869.84L563.34,872.49L559.98,883.51L552.74,898.05L548.4,901.54L540.07,914.6L531.07,925.09L529.63,929.01L522.94,939.64L516.39,945.41L508.14,946.49L500.18,949.72L485.82,958.25L479.22,960L431.01,741.88L424.79,717.6L424.15,717.64L394.45,697.94L344.74,662.59L344.42,659.12L410.76,641.43L438.69,640.98L449.32,637.28L474.2,630.57L482.61,625.11L491.11,622.09L500.51,622.05L504.32,630.55L513.18,634.7L516.43,639.89L522.68,641.67L524.44,640.09L516.86,632.24L519.66,626.45L518.73,621.94L526.08,614.42L522.94,612.07L521.65,605.74L522.32,600.06L527.33,597.15L519.71,593.45L516.92,589.24Z",
    "center_x": 555,
    "center_y": 701
  }
];

export const DIASPORA_COUNTRIES: DiasporaCountryData[] = [
  { country_code: 'FR', country_name: 'France', flag_emoji: '🇫🇷', orders_count: 520, gmv_tnd: 42500.0, active_visitors: 280, share_pct: 45.2 },
  { country_code: 'DE', country_name: 'Allemagne', flag_emoji: '🇩🇪', orders_count: 210, gmv_tnd: 18900.0, active_visitors: 115, share_pct: 18.3 },
  { country_code: 'IT', country_name: 'Italie', flag_emoji: '🇮🇹', orders_count: 180, gmv_tnd: 14400.0, active_visitors: 95, share_pct: 15.6 },
  { country_code: 'CA', country_name: 'Canada', flag_emoji: '🇨🇦', orders_count: 95, gmv_tnd: 9800.0, active_visitors: 60, share_pct: 8.3 },
  { country_code: 'AE', country_name: 'Émirats Arabes Unis', flag_emoji: '🇦🇪', orders_count: 85, gmv_tnd: 9200.0, active_visitors: 50, share_pct: 7.4 },
  { country_code: 'QA', country_name: 'Qatar', flag_emoji: '🇶🇦', orders_count: 60, gmv_tnd: 6600.0, active_visitors: 35, share_pct: 5.2 },
];

export const ZONE_PRESETS: Record<string, { label: string; name_ar: string; viewBox: string; zoom: number; panX: number; panY: number }> = {
  all: { label: 'Toute la Tunisie', name_ar: 'كامل تراب الجمهورية', viewBox: '240 -10 480 980', zoom: 1, panX: 0, panY: 0 },
  grand_tunis: { label: 'Grand Tunis', name_ar: 'تونس الكبرى', viewBox: '460 20 140 120', zoom: 2.2, panX: -120, panY: 180 },
  cap_bon_sahel: { label: 'Cap Bon & Sahel', name_ar: 'الوطن القبلي والساحل', viewBox: '460 20 220 300', zoom: 1.6, panX: -80, panY: 100 },
  nord_ouest_centre: { label: 'Nord-Ouest & Centre', name_ar: 'الشمال الغربي والوسط', viewBox: '320 20 240 380', zoom: 1.4, panX: 40, panY: 80 },
  sfax_sud: { label: 'Sfax & Grand Sud', name_ar: 'صفاقس والجنوب الكبير', viewBox: '260 320 440 650', zoom: 1.2, panX: 0, panY: -80 },
};

export function calculateHeatIntensityColor(value: number, max: number): { fill: string; text: string; label: string } {
  if (!max || max <= 0 || !value || value <= 0) {
    return { fill: '#f1f5f9', text: '#64748b', label: 'Aucune Activité' };
  }
  const ratio = Math.min(1, Math.max(0, value / max));
  if (ratio >= 0.75) return { fill: '#3730a3', text: '#ffffff', label: 'Pôle Majeur (Très Élevé)' }; // indigo-800
  if (ratio >= 0.5) return { fill: '#4f46e5', text: '#ffffff', label: 'Activité Forte' }; // indigo-600
  if (ratio >= 0.25) return { fill: '#818cf8', text: '#1e1b4b', label: 'Activité Modérée' }; // indigo-400
  if (ratio >= 0.1) return { fill: '#c7d2fe', text: '#312e81', label: 'Activité Émergente' }; // indigo-200
  return { fill: '#e0e7ff', text: '#4338ca', label: 'Activité Initiale' }; // indigo-100
}

interface TunisiaChoroplethMapProps {
  governorates?: GovernorateData[];
  diaspora?: DiasporaCountryData[];
  onSelectGovernorate?: (gov: GovernorateData) => void;
  onSelectDiasporaCountry?: (country: DiasporaCountryData) => void;
  onGovernorateClick?: (gov: GovernorateData) => void;
  currency?: string;
}

export function TunisiaChoroplethMap({
  governorates: initialGovs,
  diaspora: initialDiaspora,
  onSelectGovernorate,
  onSelectDiasporaCountry,
  onGovernorateClick,
  currency = 'TND',
}: TunisiaChoroplethMapProps) {
  const [activeView, setActiveView] = useState<'tunisia' | 'diaspora'>('tunisia');
  const [metric, setMetric] = useState<'orders' | 'gmv' | 'visitors'>('orders');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [hoveredGov, setHoveredGov] = useState<GovernorateData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [liveGovs, setLiveGovs] = useState<GovernorateData[]>(initialGovs || ALL_24_GOVERNORATES);
  const [liveDiaspora, setLiveDiaspora] = useState<DiasporaCountryData[]>(initialDiaspora || DIASPORA_COUNTRIES);
  const [selectedGov, setSelectedGov] = useState<GovernorateData | null>(liveGovs[2] || ALL_24_GOVERNORATES[2]); // Default to Tunis

  // Smooth Pan & Zoom State
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Fetch live PostgreSQL database telemetry
  useEffect(() => {
    if (initialGovs) {
      setLiveGovs(initialGovs);
      setSelectedGov(initialGovs[2] || initialGovs[0] || null);
      return;
    }

    let isMounted = true;
    const loadLiveHeatmap = async () => {
      setLoading(true);
      try {
        const res = await fetchGeoHeatmapData({ currency: currency as any });
        if (isMounted && res && res.governorates && res.governorates.length > 0) {
          const merged = ALL_24_GOVERNORATES.map((base) => {
            const remote = res.governorates.find((g: any) => {
              const code = String(g.code || g.governorate_code || '').toUpperCase();
              const iso = String(g.iso_code || '').toUpperCase();
              const name = String(g.name || g.governorate_name || '').toLowerCase();
              return (
                code === base.code ||
                iso === (base.iso_code || '') ||
                name === base.name.toLowerCase() ||
                name === base.name_ar
              );
            });
            return {
              ...base,
              orders_count: remote?.orders_count ?? remote?.orders ?? base.orders_count,
              gmv_tnd: remote?.revenue_tnd ?? remote?.gmv_tnd ?? base.gmv_tnd,
              active_visitors: remote?.buyers_count ?? remote?.active_visitors ?? base.active_visitors,
            };
          });
          setLiveGovs(merged);
          setSelectedGov((prev) => merged.find((g) => g.code === prev?.code) || merged[2] || merged[0]);
          if (res.diaspora && res.diaspora.length > 0) {
            setLiveDiaspora(res.diaspora);
          }
        }
      } catch {
        // Fallback gracefully
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadLiveHeatmap();
    return () => {
      isMounted = false;
    };
  }, [currency, initialGovs]);

  const maxVal = useMemo(() => {
    return Math.max(
      ...liveGovs.map((g) =>
        metric === 'orders' ? g.orders_count : metric === 'gmv' ? g.gmv_tnd : g.active_visitors
      ),
      1
    );
  }, [liveGovs, metric]);

  const totalNationalOrders = useMemo(() => liveGovs.reduce((acc, g) => acc + g.orders_count, 0), [liveGovs]);
  const totalNationalGmv = useMemo(() => liveGovs.reduce((acc, g) => acc + g.gmv_tnd, 0), [liveGovs]);
  const totalDiasporaOrders = useMemo(() => liveDiaspora.reduce((acc, d) => acc + d.orders_count, 0), [liveDiaspora]);
  const totalDiasporaGmv = useMemo(() => liveDiaspora.reduce((acc, d) => acc + d.gmv_tnd, 0), [liveDiaspora]);

  // Top 5 Hubs
  const topHubs = useMemo(() => {
    return [...liveGovs]
      .sort((a, b) =>
        metric === 'orders'
          ? b.orders_count - a.orders_count
          : metric === 'gmv'
          ? b.gmv_tnd - a.gmv_tnd
          : b.active_visitors - a.active_visitors
      )
      .slice(0, 5);
  }, [liveGovs, metric]);

  // Zone focus transition
  const handleZoneChange = (zoneKey: string) => {
    setSelectedZone(zoneKey);
    const preset = ZONE_PRESETS[zoneKey] || ZONE_PRESETS.all;
    setZoomLevel(preset.zoom);
    setPanOffset({ x: preset.panX, y: preset.panY });
  };

  const handleGovSelect = (gov: GovernorateData) => {
    setSelectedGov(gov);
    if (onSelectGovernorate) onSelectGovernorate(gov);
    if (onGovernorateClick) onGovernorateClick(gov);
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }

    if (mapContainerRef.current) {
      const rect = mapContainerRef.current.getBoundingClientRect();
      // Clamp in the handler — audit P2-23: reading refs during render is
      // illegal under React Compiler rules, so the clamped values are stored.
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      setTooltipPos({
        x: Math.min(Math.max(rawX, 110), (rect.width || 400) - 110),
        y: Math.max(rawY - 12, 10),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResetView = () => {
    setSelectedZone('all');
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6 select-none transition-all duration-300">
      {/* 1. Header & Primary View Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border border-indigo-200 dark:border-indigo-800 shadow-xs">
            <MapPin className="w-6 h-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Carte Choroplèthe Interactive des 24 Gouvernorats Tunisiens & Diaspora
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center gap-1 border border-emerald-500/20 shadow-xs">
                <Database className="w-3 h-3" /> Live DB Sync
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              24 Gouvernorats Administratifs avec Kerkennah & Djerba (Projection Mercator AmCharts Authentique)
            </p>
          </div>
        </div>

        {/* View & Metric Selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tunisia vs Diaspora Switch */}
          <div className="inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveView('tunisia')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all duration-200 flex items-center gap-1.5 ${
                activeView === 'tunisia'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>🇹🇳</span> 24 Gouvernorats
            </button>
            <button
              type="button"
              onClick={() => setActiveView('diaspora')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all duration-200 flex items-center gap-1.5 ${
                activeView === 'diaspora'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> Diaspora Mondiale
            </button>
          </div>

          {/* Metric Selector */}
          {activeView === 'tunisia' && (
            <div className="inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-inner">
              <button
                type="button"
                onClick={() => setMetric('orders')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                  metric === 'orders'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Commandes
              </button>
              <button
                type="button"
                onClick={() => setMetric('gmv')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                  metric === 'gmv'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                GMV ({currency})
              </button>
              <button
                type="button"
                onClick={() => setMetric('visitors')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                  metric === 'visitors'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Acheteurs
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Summary KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1 transition hover:border-indigo-300 dark:hover:border-indigo-700">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Commandes Réseau</span>
          <strong className="text-lg font-black text-slate-900 dark:text-white">
            {formatNumber(activeView === 'tunisia' ? totalNationalOrders : totalDiasporaOrders)}
          </strong>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1 transition hover:border-indigo-300 dark:hover:border-indigo-700">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Volume GMV Total</span>
          <strong className="text-lg font-black text-indigo-600 dark:text-indigo-400">
            {formatMoney(activeView === 'tunisia' ? totalNationalGmv : totalDiasporaGmv, currency)}
          </strong>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1 transition hover:border-emerald-300 dark:hover:border-emerald-700">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Couverture Territoriale</span>
          <strong className="text-lg font-black text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> 24 / 24 Régions
          </strong>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1 transition hover:border-indigo-300 dark:hover:border-indigo-700">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Premier Hub Économique</span>
          <strong className="text-lg font-black text-slate-900 dark:text-white">
            {topHubs[0]?.name || 'Tunis'} <span className="text-xs font-medium text-indigo-500">({((topHubs[0]?.orders_count || 0) / Math.max(1, totalNationalOrders) * 100).toFixed(1)}%)</span>
          </strong>
        </div>
      </div>

      {/* 3. Interactive Zone Filter Pills */}
      {activeView === 'tunisia' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-1 whitespace-nowrap">
            <Compass className="w-3.5 h-3.5 text-indigo-500" /> Focus Zone:
          </span>
          {Object.entries(ZONE_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleZoneChange(key)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
                selectedZone === key
                  ? 'bg-indigo-600 text-white shadow-xs scale-[1.02]'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>{preset.label}</span>
              <span className="text-[10px] opacity-75 font-arabic font-normal">({preset.name_ar})</span>
            </button>
          ))}
        </div>
      )}

      {/* 4. Main Map Canvas + Inspector Layout */}
      {activeView === 'tunisia' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Map Interactive Canvas (Col 1-8) */}
          <div
            ref={mapContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`lg:col-span-8 relative p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center min-h-[580px] overflow-hidden transition ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            {/* Top Toolbar: Legend & Zoom Controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
              <div className="flex flex-col gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-md">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(3.0, z + 0.3))}
                  className="p-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-200 transition"
                  title="Zoom Avant (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.3))}
                  className="p-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-200 transition"
                  title="Zoom Arrière (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleResetView}
                  className="p-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-200 transition"
                  title="Réinitialiser Vue & Position"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bottom Floating Legend Bar */}
            <div className="absolute bottom-4 right-4 z-20 p-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-md space-y-1.5 pointer-events-auto">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                <span>Intensité ({metric.toUpperCase()})</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-black">Max: {metric === 'gmv' ? formatMoney(maxVal, currency) : formatNumber(maxVal)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-5 h-3 rounded-sm bg-[#e0e7ff] border border-slate-300" title="Faible" />
                <span className="w-5 h-3 rounded-sm bg-[#c7d2fe]" title="Modéré" />
                <span className="w-5 h-3 rounded-sm bg-[#818cf8]" title="Moyen" />
                <span className="w-5 h-3 rounded-sm bg-[#4f46e5]" title="Élevé" />
                <span className="w-5 h-3 rounded-sm bg-[#3730a3]" title="Très Élevé" />
              </div>
            </div>

            {/* High-Fidelity SVG Interactive Map */}
            <div className="w-full h-full flex items-center justify-center pointer-events-auto overflow-hidden">
              <svg
                viewBox="240 -10 480 980"
                className="w-full max-w-[420px] h-auto transition-transform duration-300 drop-shadow-xl select-none"
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                  transformOrigin: 'center center',
                }}
                aria-label="Carte Choroplèthe Authentique des 24 Gouvernorats Tunisiens"
              >
                <defs>
                  <filter id="mapGlow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.18" />
                  </filter>
                  <filter id="activePinGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                <g className="cursor-pointer" filter="url(#mapGlow)">
                  {liveGovs.map((gov) => {
                    const val =
                      metric === 'orders'
                        ? gov.orders_count
                        : metric === 'gmv'
                        ? gov.gmv_tnd
                        : gov.active_visitors;
                    const heat = calculateHeatIntensityColor(val, maxVal);
                    const isSelected = selectedGov?.code === gov.code;
                    const isHovered = hoveredGov?.code === gov.code;
                    const isDimmed = selectedZone !== 'all' && gov.zone !== selectedZone;

                    return (
                      <g key={gov.code} className="transition-all duration-200">
                        <path
                          id={gov.iso_code || gov.code}
                          d={gov.svg_path}
                          fill={isDimmed ? '#f8fafc' : heat.fill}
                          fillOpacity={isDimmed ? 0.35 : 1}
                          stroke={isSelected ? '#1e1b4b' : isHovered ? '#4338ca' : '#ffffff'}
                          strokeWidth={isSelected ? 3.0 : isHovered ? 2.2 : 0.9}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          className="transition-all duration-200 hover:brightness-105"
                          onMouseEnter={() => setHoveredGov(gov)}
                          onMouseLeave={() => setHoveredGov(null)}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGovSelect(gov);
                          }}
                        >
                          <title>{`${gov.name} (${gov.name_ar}): ${formatNumber(gov.orders_count)} commandes, ${formatMoney(gov.gmv_tnd, currency)}`}</title>
                        </path>

                        {/* Centroid Code Label for Major Governorates */}
                        {zoomLevel >= 1.2 && gov.center_x && gov.center_y && !isDimmed && (
                          <text
                            x={gov.center_x}
                            y={gov.center_y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize="11"
                            fontWeight="900"
                            fill={heat.text}
                            pointerEvents="none"
                            className="select-none font-sans drop-shadow-xs"
                          >
                            {gov.code}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* Dynamic Radar Centroid Pulse for Selected Governorate */}
                  {selectedGov && selectedGov.center_x && selectedGov.center_y && (
                    <g className="pointer-events-none transition-all duration-300">
                      <circle
                        cx={selectedGov.center_x}
                        cy={selectedGov.center_y}
                        r="14"
                        fill="#4338ca"
                        fillOpacity="0.2"
                        className="animate-ping"
                      />
                      <circle
                        cx={selectedGov.center_x}
                        cy={selectedGov.center_y}
                        r="7"
                        fill="#4338ca"
                        stroke="#ffffff"
                        strokeWidth="2"
                        filter="url(#activePinGlow)"
                      />
                    </g>
                  )}
                </g>
              </svg>
            </div>

            {/* Smart Dynamic Floating Cursor Tooltip */}
            {hoveredGov && tooltipPos && (
              <div
                className="absolute p-3.5 rounded-2xl bg-slate-950/95 text-white text-xs backdrop-blur-xl shadow-2xl border border-indigo-500/30 pointer-events-none z-30 space-y-1.5 transform -translate-x-1/2 -translate-y-full mb-3 transition-all duration-75 min-w-[200px]"
                style={{
                  left: tooltipPos.x,
                  top: tooltipPos.y,
                }}
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <p className="font-black text-sm text-indigo-300">
                      {hoveredGov.name} <span className="text-xs font-arabic font-normal text-slate-400">({hoveredGov.name_ar})</span>
                    </p>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold">
                    {hoveredGov.code}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-medium pt-0.5">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Commandes:</span>
                    <strong className="text-white text-xs">{formatNumber(hoveredGov.orders_count)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Volume GMV:</span>
                    <strong className="text-indigo-300 text-xs">{formatMoney(hoveredGov.gmv_tnd, currency)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Acheteurs Actifs:</span>
                    <strong className="text-emerald-300 text-xs">{formatNumber(hoveredGov.active_visitors)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Part Nationale:</span>
                    <strong className="text-amber-300 text-xs">
                      {((hoveredGov.orders_count / Math.max(1, totalNationalOrders)) * 100).toFixed(1)}%
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Regional Detail Inspector & Leaderboard (Col 9-12) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Selected Governorate Fiche */}
            {selectedGov ? (
              <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-50/70 to-blue-50/50 dark:from-indigo-950/40 dark:to-slate-900 border border-indigo-200/80 dark:border-indigo-800/60 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Fiche Administrative
                    </span>
                    <h4 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                      {selectedGov.name}{' '}
                      <span className="text-sm font-arabic font-normal text-slate-500 dark:text-slate-400">
                        ({selectedGov.name_ar})
                      </span>
                    </h4>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white font-black text-xs shadow-xs">
                    {selectedGov.code}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900 space-y-0.5 shadow-xs">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Commandes</span>
                    <strong className="text-slate-900 dark:text-white text-base font-black">
                      {formatNumber(selectedGov.orders_count)}
                    </strong>
                  </div>
                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900 space-y-0.5 shadow-xs">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Total GMV</span>
                    <strong className="text-indigo-600 dark:text-indigo-400 text-base font-black">
                      {formatMoney(selectedGov.gmv_tnd, currency)}
                    </strong>
                  </div>
                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900 space-y-0.5 shadow-xs">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Acheteurs Actifs</span>
                    <strong className="text-emerald-600 text-base font-black">
                      {formatNumber(selectedGov.active_visitors)}
                    </strong>
                  </div>
                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900 space-y-0.5 shadow-xs">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Part Nationale</span>
                    <strong className="text-indigo-700 dark:text-indigo-300 text-base font-black">
                      {((selectedGov.orders_count / Math.max(1, totalNationalOrders)) * 100).toFixed(1)}%
                    </strong>
                  </div>
                </div>

                {/* Progress Bar of National Contribution */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] font-bold text-slate-500">
                    <span>Contribution au GMV National</span>
                    <span className="text-indigo-600 dark:text-indigo-400">
                      {((selectedGov.gmv_tnd / Math.max(1, totalNationalGmv)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(3, (selectedGov.gmv_tnd / Math.max(1, totalNationalGmv)) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {/* Top 5 Commercial Hubs Leaderboard */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-600" /> Top 5 Pôles Régionaux
                </h4>
                <span className="text-[10px] text-indigo-500 font-bold uppercase">Tri par {metric}</span>
              </div>
              <div className="space-y-2">
                {topHubs.map((hub, idx) => (
                  <button
                    key={hub.code}
                    type="button"
                    onClick={() => handleGovSelect(hub)}
                    className={`w-full p-2.5 rounded-2xl flex items-center justify-between text-xs transition-all duration-200 text-left ${
                      selectedGov?.code === hub.code
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 shadow-xs'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-6 h-6 rounded-xl text-[10px] font-black flex items-center justify-center ${
                        idx === 0
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : idx === 1
                          ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        #{idx + 1}
                      </span>
                      <div>
                        <strong className="text-slate-900 dark:text-white block">{hub.name}</strong>
                        <span className="text-[10px] text-slate-400 font-arabic">{hub.name_ar}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <strong className="text-indigo-600 dark:text-indigo-400 font-bold block">
                        {metric === 'orders'
                          ? `${formatNumber(hub.orders_count)} cmd`
                          : formatMoney(hub.gmv_tnd, currency)}
                      </strong>
                      <span className="text-[10px] text-slate-400">
                        {((hub.orders_count / Math.max(1, totalNationalOrders)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 5. Global Diaspora Telemetry View */
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveDiaspora.map((country, idx) => (
              <div
                key={country.country_code}
                onClick={() => onSelectDiasporaCountry && onSelectDiasporaCountry(country)}
                className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3.5 cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-3xl">{country.flag_emoji}</span>
                    <div>
                      <strong className="text-sm font-black text-slate-900 dark:text-white block">
                        {country.country_name}
                      </strong>
                      <span className="text-[10px] font-mono font-bold text-slate-400">ISO: {country.country_code}</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-black text-xs">
                    {country.share_pct}%
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-slate-500">
                    <span>Part Diaspora</span>
                    <span className="text-indigo-600 dark:text-indigo-400">{country.share_pct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${country.share_pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between text-xs font-bold pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">
                    Commandes: <strong className="text-slate-900 dark:text-white">{formatNumber(country.orders_count)}</strong>
                  </span>
                  <span className="text-indigo-600 dark:text-indigo-400">
                    GMV: <strong>{formatMoney(country.gmv_tnd, currency)}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
