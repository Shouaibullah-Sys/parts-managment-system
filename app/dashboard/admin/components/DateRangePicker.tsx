"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { faIR } from "date-fns/locale";
import { DateRange } from "@/types/dashboard";
import { quickFilters } from "@/lib/utils/dashboard";

interface DateRangePickerProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

export const DateRangePicker = ({
  dateRange,
  onDateRangeChange,
}: DateRangePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleQuickFilter = (filter: (typeof quickFilters)[0]) => {
    onDateRangeChange(filter.getRange());
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full sm:w-[260px] justify-start text-left font-normal",
            !dateRange && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="ml-2 h-4 w-4" />
          {dateRange.from ? (
            dateRange.to ? (
              <>
                {format(dateRange.from, "yyyy/MM/dd", { locale: faIR })} -{" "}
                {format(dateRange.to, "yyyy/MM/dd", { locale: faIR })}
              </>
            ) : (
              format(dateRange.from, "yyyy/MM/dd", { locale: faIR })
            )
          ) : (
            <span>انتخاب تاریخ</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 z-50"
        align="start"
        sideOffset={5}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <div className="flex flex-col p-4">
          <div className="grid grid-cols-2 gap-2 mb-4">
            {quickFilters.map((filter) => (
              <Button
                key={filter.value}
                variant="outline"
                size="sm"
                onClick={() => handleQuickFilter(filter)}
                className="text-xs"
              >
                {filter.label}
              </Button>
            ))}
          </div>
          <div className="overflow-auto">
            <Calendar
              mode="range"
              selected={{
                from: dateRange.from,
                to: dateRange.to,
              }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  onDateRangeChange({ from: range.from, to: range.to });
                  setIsOpen(false);
                }
              }}
              numberOfMonths={1}
              locale={faIR}
              className="rounded-md border"
            />
          </div>
          <div className="flex justify-between mt-4 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-xs"
            >
              لغو
            </Button>
            <Button
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-xs"
            >
              تأیید
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
