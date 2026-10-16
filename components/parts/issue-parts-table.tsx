// components/parts/issue-parts-table.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Fuse from "fuse.js";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Package,
  PackagePlus,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  User,
  Loader2,
  FileText,
  Search,
  X,
  Pencil,
  Phone,
  MapPin,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { CustomerSelector } from "./customer-selector";
import { SupplierSelectField } from "./supplier-select-field";
import type { Supplier } from "./supplier-form-dialog";
import HijriDatePicker from "@/components/hijri-date-picker";

interface Customer {
  id: number;
  name: string;
  normalizedName: string;
  phone: string | null;
  address: string | null;
}

interface Part {
  id: number;
  partNumber: string;
  name: string;
  section: "E" | "D" | "F" | "G" | "OLD";
  currentStock: number;
  salePrice: string | null;
  minStock: number;
  costPrice?: string | null;
  active?: boolean;
}

interface CartItem {
  part: Part;
  quantity: number;
  customPrice: number;
}

interface ExternalItem {
  tempId: string;
  itemName: string;
  quantity: number;
  customPrice: number;
  itemCost: number;
  supplierId?: number | null;
  supplierName?: string | null;
}

const afn = (n: number) =>
  `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} افغانی`;

const unitPriceOf = (item: CartItem) =>
  item.customPrice ?? parseFloat(item.part.salePrice || "0");

function StockPill({ part }: { part: Part }) {
  const low = part.currentStock <= part.minStock;
  const out = part.currentStock <= 0;
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`font-mono font-bold tabular-nums ${
          out
            ? "text-destructive"
            : low
              ? "text-orange-500"
              : "text-emerald-600"
        }`}
      >
        {part.currentStock}
      </span>
      {(low || out) && (
        <AlertTriangle
          className={`h-3.5 w-3.5 ${out ? "text-destructive" : "text-orange-500"}`}
        />
      )}
      <span className="text-[11px] text-muted-foreground">
        / حداقل {part.minStock}
      </span>
    </span>
  );
}

export function IssuePartsTable() {
  const router = useRouter();

  const [parts, setParts] = useState<Part[]>([]);
  const [partsLoading, setPartsLoading] = useState(true);
  const fuseRef = useRef<Fuse<Part> | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Part[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [externalItems, setExternalItems] = useState<ExternalItem[]>([]);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [externalDialogOpen, setExternalDialogOpen] = useState(false);
  const [externalForm, setExternalForm] = useState({
    itemName: "",
    quantity: 1,
    unitPrice: "",
    itemCost: "",
  });
  const [externalSupplier, setExternalSupplier] = useState<Supplier | null>(null);

  const loadParts = useCallback(async () => {
    try {
      setPartsLoading(true);
      const res = await fetch("/api/parts/search?limit=2000");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const processed: Part[] = json.data.map((p: Part) => ({
          ...p,
          currentStock: Number(p.currentStock) || 0,
          minStock: Number(p.minStock) || 0,
          salePrice: p.salePrice ?? "0",
          costPrice: p.costPrice ?? "0",
        }));
        setParts(processed);
        fuseRef.current = new Fuse(processed, {
          keys: [
            { name: "partNumber", weight: 2 },
            { name: "name", weight: 1 },
          ],
          threshold: 0.35,
          ignoreLocation: true,
          includeScore: true,
        });
      }
    } catch (e) {
      console.error("Error loading parts:", e);
      toast.error("خطا در بارگذاری قطعات");
    } finally {
      setPartsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadParts();
  }, [loadParts]);

  // Instant client-side search over the loaded catalog.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      setShowDropdown(false);
      setActiveIndex(0);
      return;
    }
    const res = fuseRef.current
      ? fuseRef.current.search(q).slice(0, 8).map((r) => r.item)
      : parts
          .filter(
            (p) =>
              p.partNumber.toLowerCase().includes(q.toLowerCase()) ||
              p.name.toLowerCase().includes(q.toLowerCase()),
          )
          .slice(0, 8);
    setResults(res);
    setShowDropdown(true);
    setActiveIndex(0);
  }, [query, parts]);

  // "/" focuses the search box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el as HTMLElement)?.isContentEditable;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const addToCart = useCallback(
    (part: Part) => {
      setQuery("");
      setShowDropdown(false);
      searchRef.current?.focus();
      setCart((prev) => {
        const existing = prev.find((i) => i.part.id === part.id);
        if (existing) {
          if (existing.quantity + 1 > part.currentStock) {
            toast.warning(`موجودی کافی نیست (${part.currentStock})`);
            return prev;
          }
          return prev.map((i) =>
            i.part.id === part.id ? { ...i, quantity: i.quantity + 1 } : i,
          );
        }
        return [
          ...prev,
          {
            part,
            quantity: 1,
            customPrice: parseFloat(part.salePrice || "0") || 0,
          },
        ];
      });
    },
    [],
  );

  const updateQuantity = (partId: number, q: number) => {
    if (q < 1) return removeFromCart(partId);
    const item = cart.find((i) => i.part.id === partId);
    if (item && q > item.part.currentStock) {
      toast.warning(`موجودی موجود: ${item.part.currentStock}`);
      return;
    }
    setCart((prev) =>
      prev.map((i) => (i.part.id === partId ? { ...i, quantity: q } : i)),
    );
  };

  const updateCustomPrice = (partId: number, price: number) =>
    setCart((prev) =>
      prev.map((i) => (i.part.id === partId ? { ...i, customPrice: price } : i)),
    );

  const removeFromCart = (partId: number) =>
    setCart((prev) => prev.filter((i) => i.part.id !== partId));

  const addExternalItem = (item: Omit<ExternalItem, "tempId">) =>
    setExternalItems((prev) => [
      ...prev,
      { ...item, tempId: `${Date.now()}-${Math.random().toString(36).slice(2)}` },
    ]);

  const removeExternalItem = (tempId: string) =>
    setExternalItems((prev) => prev.filter((i) => i.tempId !== tempId));

  const updateExternalItem = (
    tempId: string,
    patch: Partial<Omit<ExternalItem, "tempId">>,
  ) =>
    setExternalItems((prev) =>
      prev.map((i) => (i.tempId === tempId ? { ...i, ...patch } : i)),
    );

  const handleAddExternalFromForm = () => {
    const name = externalForm.itemName.trim();
    if (!name) {
      toast.error("نام پرزه را وارد کنید");
      return;
    }
    if (externalForm.quantity < 1) {
      toast.error("تعداد باید حداقل ۱ باشد");
      return;
    }
    addExternalItem({
      itemName: name,
      quantity: externalForm.quantity,
      customPrice: parseFloat(externalForm.unitPrice) || 0,
      itemCost: parseFloat(externalForm.itemCost) || 0,
      supplierId: externalSupplier?.id ?? null,
      supplierName: externalSupplier?.name ?? null,
    });
    setExternalForm({ itemName: "", quantity: 1, unitPrice: "", itemCost: "" });
    setExternalSupplier(null);
    toast.success("پرزه خارجی افزوده شد");
  };

  const totals = useMemo(() => {
    const stockSubtotal = cart.reduce(
      (s, i) => s + unitPriceOf(i) * i.quantity,
      0,
    );
    const externalSubtotal = externalItems.reduce(
      (s, i) => s + i.customPrice * i.quantity,
      0,
    );
    const qty =
      cart.reduce((s, i) => s + i.quantity, 0) +
      externalItems.reduce((s, i) => s + i.quantity, 0);
    return {
      stockSubtotal,
      externalSubtotal,
      total: stockSubtotal + externalSubtotal,
      qty,
      lines: cart.length + externalItems.length,
    };
  }, [cart, externalItems]);

  const buildItemsPayload = () => [
    ...cart.map((item) => ({
      kind: "stock" as const,
      partId: item.part.id,
      quantity: item.quantity,
      unitPrice: unitPriceOf(item),
    })),
    ...externalItems.map((item) => ({
      kind: "external" as const,
      itemName: item.itemName,
      quantity: item.quantity,
      unitPrice: item.customPrice,
      itemCost: item.itemCost,
      supplierId: item.supplierId ?? null,
      supplierName: item.supplierName ?? null,
    })),
  ];

  const resetForm = () => {
    setCart([]);
    setExternalItems([]);
    setSelectedCustomer(null);
    setIsNewCustomer(false);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    setInvoiceNumber("");
    setNotes("");
    setError(null);
  };

  const generateAndDownloadPDF = async (customerId: number, salesIds?: number[]) => {
    try {
      const url =
        salesIds && salesIds.length > 0
          ? `/api/issue-parts/${customerId}/pdf?saleIds=${salesIds.join(",")}`
          : `/api/issue-parts/${customerId}/pdf`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to generate PDF");
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = downloadUrl;
      a.download = `invoice-${customerId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (e) {
      console.error("Error downloading PDF:", e);
    }
  };

  const validate = () => {
    if (!customerName.trim()) {
      toast.error("لطفاً نام مشتری را وارد کنید");
      return false;
    }
    if (cart.length === 0 && externalItems.length === 0) {
      toast.error("سبد خالی است؛ قطعه‌ای اضافه کنید");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/issue-parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim(),
          invoiceDate,
          invoiceNumber: invoiceNumber.trim(),
          notes: notes.trim(),
          items: buildItemsPayload(),
          action: "save",
        }),
      });
      const result = await response.json();
      if (result.success) {
        await generateAndDownloadPDF(result.data.customerId, result.data.salesIds);
        toast.success("بل ذخیره شد");
        resetForm();
        router.push("/parts/records");
      } else {
        setError(result.message || "خطا در ایجاد سند");
        toast.error(result.message || "خطا در ایجاد سند");
      }
    } catch (e) {
      console.error("Error submitting issue:", e);
      setError("خطا در اتصال به سرور");
      toast.error("خطا در اتصال به سرور");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomerSelect = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    if (customer) {
      setCustomerName(customer.name);
      setCustomerPhone(customer.phone || "");
      setCustomerAddress(customer.address || "");
      setIsNewCustomer(false);
    }
  };

  const handleNewCustomer = () => {
    setIsNewCustomer(true);
    setSelectedCustomer(null);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
  };

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      addToCart(results[activeIndex] ?? results[0]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const empty = cart.length === 0 && externalItems.length === 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* ── Main: search + basket grid ───────────────────────────────── */}
      <div className="lg:col-span-2 space-y-4">
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query.trim() && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              onKeyDown={onSearchKeyDown}
              placeholder="جستجوی قطعه بر اساس شماره یا نام… (برای جستجو / را بزنید)"
              className="pl-9 pr-9 h-12 text-base"
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  searchRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {showDropdown && (
            <div className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
              {partsLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  در حال بارگذاری قطعات…
                </div>
              ) : results.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  قطعه‌ای یافت نشد
                </div>
              ) : (
                <ul className="max-h-80 overflow-y-auto divide-y divide-border">
                  {results.map((part, idx) => (
                    <li key={part.id}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          addToCart(part);
                        }}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors ${
                          idx === activeIndex ? "bg-accent" : "hover:bg-accent/50"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              {part.partNumber}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {part.section}
                            </Badge>
                          </div>
                          <p className="font-medium truncate mt-0.5">{part.name}</p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <StockPill part={part} />
                          <span className="text-sm font-medium tabular-nums w-28 text-right">
                            {afn(parseFloat(part.salePrice || "0"))}
                          </span>
                          <Plus className="h-4 w-4 text-primary" />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <Card className="shadow-sm">
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-5 w-5 text-primary" />
              سبد صدور
              {totals.lines > 0 && (
                <Badge className="bg-primary text-primary-foreground">
                  {totals.lines} قلم / {totals.qty} عدد
                </Badge>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-auto gap-1"
                onClick={() => setExternalDialogOpen(true)}
                disabled={isLoading}
              >
                <PackagePlus className="h-4 w-4" />
                پرزه از فروشگاه دیگر
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {empty ? (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>سبد خالی است</p>
                <p className="text-sm">قطعه را جستجو کرده و اضافه کنید</p>
              </div>
            ) : (
              <div className="max-h-[28rem] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
                    <TableRow>
                      <TableHead className="w-8 text-center">#</TableHead>
                      <TableHead>کد قطعه</TableHead>
                      <TableHead>نام قطعه</TableHead>
                      <TableHead>بخش</TableHead>
                      <TableHead>موجودی</TableHead>
                      <TableHead className="text-center">تعداد</TableHead>
                      <TableHead>قیمت واحد</TableHead>
                      <TableHead>جمع</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item, i) => {
                      const price = unitPriceOf(item);
                      return (
                        <TableRow key={`s-${item.part.id}`}>
                          <TableCell className="text-center text-muted-foreground">
                            {i + 1}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              {item.part.partNumber}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[16rem]">
                            <span className="font-medium line-clamp-1">
                              {item.part.name}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.part.section}</Badge>
                          </TableCell>
                          <TableCell>
                            <StockPill part={item.part} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-7 w-7"
                                onClick={() =>
                                  updateQuantity(item.part.id, item.quantity - 1)
                                }
                                disabled={isLoading}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                min={1}
                                max={item.part.currentStock}
                                value={item.quantity}
                                onChange={(e) =>
                                  updateQuantity(
                                    item.part.id,
                                    parseInt(e.target.value) || 1,
                                  )
                                }
                                disabled={isLoading}
                                className="w-16 h-7 text-center tabular-nums"
                              />
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-7 w-7"
                                onClick={() =>
                                  updateQuantity(item.part.id, item.quantity + 1)
                                }
                                disabled={
                                  item.quantity >= item.part.currentStock ||
                                  isLoading
                                }
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              value={price}
                              onChange={(e) =>
                                updateCustomPrice(
                                  item.part.id,
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              disabled={isLoading}
                              className="w-24 h-7 tabular-nums"
                            />
                          </TableCell>
                          <TableCell className="font-semibold tabular-nums">
                            {afn(price * item.quantity)}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => removeFromCart(item.part.id)}
                              disabled={isLoading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {externalItems.map((item, i) => (
                      <TableRow key={item.tempId} className="bg-amber-50/40 dark:bg-amber-950/10">
                        <TableCell className="text-center text-muted-foreground">
                          {cart.length + i + 1}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-[10px]">
                            خارجی
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[16rem]">
                          <span className="font-medium line-clamp-1">
                            {item.itemName}
                          </span>
                          {item.supplierName && (
                            <span className="block text-xs text-muted-foreground">
                              {item.supplierName}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">—</TableCell>
                        <TableCell className="text-muted-foreground">—</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() =>
                                updateExternalItem(item.tempId, {
                                  quantity: Math.max(1, item.quantity - 1),
                                })
                              }
                              disabled={isLoading}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) =>
                                updateExternalItem(item.tempId, {
                                  quantity: parseInt(e.target.value) || 1,
                                })
                              }
                              disabled={isLoading}
                              className="w-16 h-7 text-center tabular-nums"
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() =>
                                updateExternalItem(item.tempId, {
                                  quantity: item.quantity + 1,
                                })
                              }
                              disabled={isLoading}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            value={item.customPrice}
                            onChange={(e) =>
                              updateExternalItem(item.tempId, {
                                customPrice: parseFloat(e.target.value) || 0,
                              })
                            }
                            disabled={isLoading}
                            className="w-24 h-7 tabular-nums"
                          />
                        </TableCell>
                        <TableCell className="font-semibold tabular-nums">
                          {afn(item.customPrice * item.quantity)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => setExternalDialogOpen(true)}
                              disabled={isLoading}
                              title="ویرایش"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => removeExternalItem(item.tempId)}
                              disabled={isLoading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter className="bg-muted/40">
                    <TableRow>
                      <TableCell colSpan={5} className="font-medium">
                        مجموع
                      </TableCell>
                      <TableCell className="text-center font-medium tabular-nums">
                        {totals.qty}
                      </TableCell>
                      <TableCell />
                      <TableCell className="text-base font-bold text-primary tabular-nums">
                        {afn(totals.total)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Sidebar: checkout ────────────────────────────────────────── */}
      <div className="space-y-4 lg:sticky lg:top-6">
        <Card className="shadow-sm">
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-5 w-5 text-primary" />
              مشتری و فاکتور
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <CustomerSelector
              onCustomerSelect={handleCustomerSelect}
              onNewCustomer={handleNewCustomer}
              disabled={isLoading}
            />

            {isNewCustomer && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="نام مشتری *"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="شماره تماس"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="آدرس"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <HijriDatePicker
                value={invoiceDate}
                onChange={setInvoiceDate}
                placeholder="تاریخ صدور"
              />
              <Input
                placeholder="شماره فاکتور (اختیاری)"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                placeholder="توضیحات (اختیاری)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>اجناس انبار</span>
              <span className="tabular-nums">{afn(totals.stockSubtotal)}</span>
            </div>
            {externalItems.length > 0 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>پرزه‌های خارجی</span>
                <span className="tabular-nums">{afn(totals.externalSubtotal)}</span>
              </div>
            )}
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <span className="font-semibold">مبلغ کل</span>
              <span className="text-xl font-bold text-primary tabular-nums">
                {afn(totals.total)}
              </span>
            </div>

            {error && (
              <div className="text-destructive text-sm bg-destructive/10 p-3 rounded border border-destructive/40">
                {error}
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={isLoading || empty}
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              ذخیره و ایجاد بل
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── External part dialog ─────────────────────────────────────── */}
      <Dialog open={externalDialogOpen} onOpenChange={setExternalDialogOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5 text-primary" />
              پرزه‌های خارجی
              {externalItems.length > 0 && (
                <Badge className="bg-amber-500 hover:bg-amber-500 text-white">
                  {externalItems.length} ردیف
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              هر ردیف یک قلم جدول است؛ در همان‌جا ویرایش کنید. این پرزه‌ها فقط
              در بل محاسبه می‌شوند و به موجودی انبار افزوده نمی‌شوند.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader className="bg-muted/60">
                <TableRow>
                  <TableHead className="w-8 text-center">#</TableHead>
                  <TableHead>نام پرزه</TableHead>
                  <TableHead className="w-44">تأمین‌کننده</TableHead>
                  <TableHead className="text-center">تعداد</TableHead>
                  <TableHead>قیمت واحد</TableHead>
                  <TableHead>بهای خرید</TableHead>
                  <TableHead>جمع</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {externalItems.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-muted-foreground py-6"
                    >
                      هنوز ردیفی ثبت نشده — از ردیف پایین اضافه کنید
                    </TableCell>
                  </TableRow>
                )}

                {externalItems.map((item, i) => (
                  <TableRow
                    key={item.tempId}
                    className="bg-amber-50/40 dark:bg-amber-950/10"
                  >
                    <TableCell className="text-center text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.itemName}
                        onChange={(e) =>
                          updateExternalItem(item.tempId, {
                            itemName: e.target.value,
                          })
                        }
                        disabled={isLoading}
                        className="h-8 min-w-40"
                      />
                    </TableCell>
                    <TableCell>
                      <SupplierSelectField
                        compact
                        value={
                          item.supplierName
                            ? { id: item.supplierId ?? 0, name: item.supplierName }
                            : null
                        }
                        onChange={(s) =>
                          updateExternalItem(item.tempId, {
                            supplierId: s?.id ?? null,
                            supplierName: s?.name ?? null,
                          })
                        }
                        disabled={isLoading}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateExternalItem(item.tempId, {
                            quantity: parseInt(e.target.value) || 1,
                          })
                        }
                        disabled={isLoading}
                        className="w-16 h-8 text-center tabular-nums"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={item.customPrice}
                        onChange={(e) =>
                          updateExternalItem(item.tempId, {
                            customPrice: parseFloat(e.target.value) || 0,
                          })
                        }
                        disabled={isLoading}
                        className="w-24 h-8 tabular-nums"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={item.itemCost}
                        onChange={(e) =>
                          updateExternalItem(item.tempId, {
                            itemCost: parseFloat(e.target.value) || 0,
                          })
                        }
                        disabled={isLoading}
                        className="w-24 h-8 tabular-nums"
                      />
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">
                      {afn(item.customPrice * item.quantity)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeExternalItem(item.tempId)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {/* New-record row */}
                <TableRow className="bg-primary/5 border-t-2 border-dashed border-primary/30">
                  <TableCell className="text-center">
                    <Plus className="h-4 w-4 text-primary mx-auto" />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={externalForm.itemName}
                      onChange={(e) =>
                        setExternalForm((p) => ({
                          ...p,
                          itemName: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddExternalFromForm();
                        }
                      }}
                      placeholder="نام پرزه (Enter = افزودن)"
                      disabled={isLoading}
                      className="h-8 min-w-40"
                    />
                  </TableCell>
                  <TableCell>
                    <SupplierSelectField
                      compact
                      value={externalSupplier}
                      onChange={setExternalSupplier}
                      disabled={isLoading}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      value={externalForm.quantity}
                      onChange={(e) =>
                        setExternalForm((p) => ({
                          ...p,
                          quantity: parseInt(e.target.value) || 1,
                        }))
                      }
                      disabled={isLoading}
                      className="w-16 h-8 text-center tabular-nums"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      value={externalForm.unitPrice}
                      onChange={(e) =>
                        setExternalForm((p) => ({
                          ...p,
                          unitPrice: e.target.value,
                        }))
                      }
                      disabled={isLoading}
                      className="w-24 h-8 tabular-nums"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      value={externalForm.itemCost}
                      onChange={(e) =>
                        setExternalForm((p) => ({
                          ...p,
                          itemCost: e.target.value,
                        }))
                      }
                      disabled={isLoading}
                      className="w-24 h-8 tabular-nums"
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {afn(
                      (parseFloat(externalForm.unitPrice) || 0) *
                        (externalForm.quantity || 0),
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleAddExternalFromForm}
                      disabled={isLoading || !externalForm.itemName.trim()}
                      title="افزودن"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
              <TableFooter className="bg-muted/40">
                <TableRow>
                  <TableCell colSpan={6} className="font-medium">
                    جمع کل پرزه‌های خارجی
                  </TableCell>
                  <TableCell className="font-bold text-amber-600 tabular-nums">
                    {afn(
                      externalItems.reduce(
                        (s, i) => s + i.customPrice * i.quantity,
                        0,
                      ),
                    )}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">
            نکته: «بهای خرید» فقط ذخیره می‌شود و در بل نمایش داده نمی‌شود.
          </p>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => setExternalDialogOpen(false)}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              بازگشت به سبد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default IssuePartsTable;
