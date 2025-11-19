"use client";

import { LowStockItem } from "@/types/dashboard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye } from "lucide-react";
import Link from "next/link";

interface LowStockTableProps {
  items: LowStockItem[];
}

export const LowStockTable = ({ items }: LowStockTableProps) => {
  return (
    <div className="space-y-3 sm:hidden">
      {items.map((item) => {
        const deficit = item.min_stock - item.current_stock;
        return (
          <Card key={item.id} className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-sm">{item.name}</h4>
                  <p className="text-xs text-muted-foreground font-mono">
                    {item.part_number}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {item.section}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">حداقل:</span>
                  <p>{item.min_stock.toLocaleString("fa-IR")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">موجودی:</span>
                  <p
                    className={
                      item.current_stock === 0
                        ? "text-red-600 font-bold"
                        : item.current_stock < item.min_stock / 2
                          ? "text-orange-600 font-medium"
                          : "text-amber-600"
                    }
                  >
                    {item.current_stock.toLocaleString("fa-IR")}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">کمبود:</span>
                  <p className="text-red-600 font-medium">
                    -{deficit.toLocaleString("fa-IR")}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">وضعیت:</span>
                  <Badge
                    variant={
                      item.current_stock === 0 ? "destructive" : "outline"
                    }
                    className={
                      item.current_stock === 0
                        ? "bg-red-600 text-xs"
                        : item.current_stock < item.min_stock / 2
                          ? "border-orange-600 text-orange-600 bg-orange-50 text-xs"
                          : "border-amber-600 text-amber-600 bg-amber-50 text-xs"
                    }
                  >
                    {item.current_stock === 0
                      ? "تمام شده"
                      : item.current_stock < item.min_stock / 2
                        ? "بحرانی"
                        : "موجودی کم"}
                  </Badge>
                </div>
              </div>

              <Button variant="ghost" size="sm" asChild className="w-full">
                <Link href={`/parts/${item.id}`}>
                  <Eye className="h-4 w-4 ml-1" />
                  مشاهده جزئیات
                </Link>
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export const DesktopLowStockTable = ({ items }: LowStockTableProps) => {
  return (
    <div className="hidden sm:block rounded-md border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">شماره قطعه</TableHead>
              <TableHead className="whitespace-nowrap">نام</TableHead>
              <TableHead className="whitespace-nowrap">بخش</TableHead>
              <TableHead className="whitespace-nowrap">حداقل موجودی</TableHead>
              <TableHead className="whitespace-nowrap">موجودی فعلی</TableHead>
              <TableHead className="whitespace-nowrap">کمبود</TableHead>
              <TableHead className="whitespace-nowrap">وضعیت</TableHead>
              <TableHead className="whitespace-nowrap">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const deficit = item.min_stock - item.current_stock;
              return (
                <TableRow key={item.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono whitespace-nowrap">
                    {item.part_number}
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    {item.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {item.section}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {item.min_stock.toLocaleString("fa-IR")}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span
                      className={
                        item.current_stock === 0
                          ? "text-red-600 font-bold"
                          : item.current_stock < item.min_stock / 2
                            ? "text-orange-600 font-medium"
                            : "text-amber-600"
                      }
                    >
                      {item.current_stock.toLocaleString("fa-IR")}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="text-red-600 font-medium">
                      -{deficit.toLocaleString("fa-IR")}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge
                      variant={
                        item.current_stock === 0 ? "destructive" : "outline"
                      }
                      className={
                        item.current_stock === 0
                          ? "bg-red-600"
                          : item.current_stock < item.min_stock / 2
                            ? "border-orange-600 text-orange-600 bg-orange-50"
                            : "border-amber-600 text-amber-600 bg-amber-50"
                      }
                    >
                      {item.current_stock === 0
                        ? "تمام شده"
                        : item.current_stock < item.min_stock / 2
                          ? "بحرانی"
                          : "موجودی کم"}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/parts/${item.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
