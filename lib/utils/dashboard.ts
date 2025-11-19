import { DateRange } from "@/types/dashboard";
import {
  format,
  startOfToday,
  startOfWeek,
  startOfMonth,
  isSameDay,
  isSameWeek,
  isSameMonth,
  differenceInDays,
} from "date-fns";
import { faIR } from "date-fns/locale";

export const getSalesCardInfo = (dateRange: DateRange) => {
  const today = startOfToday();
  const weekStart = startOfWeek(new Date(), { locale: faIR });
  const monthStart = startOfMonth(new Date());
  const lifetimeStart = new Date(2020, 0, 1);

  if (isSameDay(dateRange.from, today) && isSameDay(dateRange.to, today)) {
    return {
      title: "فروش امروز",
      dateText: format(today, "yyyy/MM/dd", { locale: faIR }),
    };
  }

  if (
    isSameDay(dateRange.from, weekStart) &&
    isSameDay(dateRange.to, today) &&
    isSameWeek(dateRange.from, dateRange.to, { locale: faIR })
  ) {
    return {
      title: "فروش این هفته",
      dateText: "این هفته",
    };
  }

  if (
    isSameDay(dateRange.from, monthStart) &&
    isSameDay(dateRange.to, today) &&
    isSameMonth(dateRange.from, dateRange.to)
  ) {
    return {
      title: "فروش این ماه",
      dateText: "این ماه",
    };
  }

  if (
    isSameDay(dateRange.from, lifetimeStart) &&
    isSameDay(dateRange.to, today)
  ) {
    return {
      title: "فروش کل",
      dateText: "همه زمانها",
    };
  }

  if (isSameDay(dateRange.from, dateRange.to)) {
    return {
      title: "فروش روز",
      dateText: format(dateRange.from, "yyyy/MM/dd", { locale: faIR }),
    };
  }

  const dayDifference = differenceInDays(dateRange.to, dateRange.from);
  if (dayDifference <= 7) {
    return {
      title: `فروش ${dayDifference} روزه`,
      dateText: `${format(dateRange.from, "yyyy/MM/dd", { locale: faIR })} - ${format(dateRange.to, "yyyy/MM/dd", { locale: faIR })}`,
    };
  }

  return {
    title: "فروش در بازه انتخابی",
    dateText: `${format(dateRange.from, "yyyy/MM/dd", { locale: faIR })} - ${format(dateRange.to, "yyyy/MM/dd", { locale: faIR })}`,
  };
};

export const quickFilters = [
  {
    label: "امروز",
    value: "today",
    getRange: () => ({
      from: startOfToday(),
      to: startOfToday(),
    }),
  },
  {
    label: "این هفته",
    value: "thisWeek",
    getRange: () => ({
      from: startOfWeek(new Date(), { locale: faIR }),
      to: new Date(),
    }),
  },
  {
    label: "این ماه",
    value: "thisMonth",
    getRange: () => ({
      from: startOfMonth(new Date()),
      to: new Date(),
    }),
  },
  {
    label: "همه زمانها",
    value: "lifetime",
    getRange: () => ({
      from: new Date(2020, 0, 1),
      to: new Date(),
    }),
  },
];
