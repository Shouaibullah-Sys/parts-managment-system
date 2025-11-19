// components/header.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  FileText,
  Users,
  BarChart3,
  ShoppingCart,
  Menu,
  X,
  Home,
  DollarSign,
  Settings,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logout } from "./logout";
import { ModeSwitcher } from "./mode-switcher";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

// Define navigation structure based on roles - COMPREHENSIVE DESKTOP & MOBILE
const getNavigationConfig = (
  role?: string,
  isMobile: boolean = false
): NavigationSection[] => {
  const commonItems: NavigationItem[] = [
    {
      name: "مدیریت قطعات",
      href: "/parts/manage",
      icon: Package,
      description: "مدیریت موجودی قطعات",
    },
    {
      name: "صدور قطعات",
      href: "/parts/issue",
      icon: ShoppingCart,
      description: "ایجاد سفارشات صدور",
    },
    {
      name: "سوابق",
      href: "/parts/records",
      icon: FileText,
      description: "مشاهده سوابق تراکنش‌ها",
    },
  ];

  if (role === "admin") {
    // For admin desktop view - comprehensive menu without /dashboard link
    if (!isMobile) {
      return [
        {
          title: "پنل ادمین",
          items: [
            {
              name: "دشبورد ادمین",
              href: "/dashboard/admin",
              icon: BarChart3,
              description: "نمای کلی ادمین و تجزیه و تحلیل",
            },
            {
              name: "مدیریت کاربران",
              href: "/dashboard/admin/users",
              icon: Users,
              description: "مدیریت حساب‌های کاربری و نقش‌ها",
            },
            {
              name: "تحلیل فروش",
              href: "/dashboard/admin/sales",
              icon: DollarSign,
              description: "گزارش‌های فروش و تجزیه و تحلیل",
            },
            {
              name: "مدیریت مخارج",
              href: "/dashboard/admin/expenses",
              icon: FileText,
              description: "پیگیری و مدیریت مخارج",
            },
          ],
        },
        {
          title: "مدیریت موجودی",
          items: commonItems,
        },
        {
          title: "ابزارها و امکانات",
          items: [
            {
              name: "اقدامات اولویت‌دار",
              href: "/parts/priority-actions",
              icon: Settings,
              description: "ابزارهای اداری و اقدامات",
            },
          ],
        },
      ];
    }

    // For admin mobile view
    return [
      {
        title: "نمای دشبوردها",
        items: [
          {
            name: "دشبورد ادمین",
            href: "/dashboard/admin",
            icon: BarChart3,
            description: "نمای کلی ادمین و تجزیه و تحلیل",
          },
        ],
      },
      {
        title: "مدیریت",
        items: [
          {
            name: "مدیریت کاربران",
            href: "/dashboard/admin/users",
            icon: Users,
            description: "مدیریت حساب‌های کاربری و نقش‌ها",
          },
          {
            name: "تحلیل فروش",
            href: "/dashboard/admin/sales",
            icon: DollarSign,
            description: "گزارش‌های فروش و تجزیه و تحلیل",
          },
          {
            name: "مدیریت مخارج",
            href: "/dashboard/admin/expenses",
            icon: FileText,
            description: "پیگیری و مدیریت مخارج",
          },
        ],
      },
      {
        title: "موجودی",
        items: commonItems,
      },
      {
        title: "ابزارها و امکانات",
        items: [
          {
            name: "اقدامات اولویت‌دار",
            href: "/parts/priority-actions",
            icon: Settings,
            description: "ابزارهای اداری و اقدامات",
          },
        ],
      },
    ];
  }

  // Staff role - only the 3 specific menu items as requested
  return [
    {
      title: "موجودی",
      items: commonItems,
    },
  ];
};

export function Header() {
  const [userRole, setUserRole] = useState<string>("staff");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const session = await authClient.getSession();
        if (!session?.data?.user) {
          setUserRole("staff");
          return;
        }

        const response = await fetch("/api/user/role");
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.role || "staff");
        } else {
          setUserRole("staff");
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setUserRole("staff");
      }
    };

    fetchUserRole();
  }, []);

  // Get separate configs for desktop and mobile
  const desktopNavigationConfig = getNavigationConfig(userRole, false);
  const mobileNavigationConfig = getNavigationConfig(userRole, true);

  // Flatten desktop navigation items (without animations)
  const desktopNavItems = desktopNavigationConfig.flatMap(
    (section) => section.items
  );

  // Simplified mobile menu variants
  const mobileMenuVariants = {
    closed: {
      opacity: 0,
      x: "100%",
    },
    open: {
      opacity: 1,
      x: 0,
    },
  };

  const mobileItemVariants = {
    closed: { opacity: 0, x: 20 },
    open: { opacity: 1, x: 0 },
  };

  const NavigationLink = ({
    item,
    isMobile = false,
  }: {
    item: NavigationItem;
    isMobile?: boolean;
  }) => {
    const isActive =
      pathname === item.href || pathname.startsWith(item.href + "/");

    if (isMobile) {
      return (
        <motion.div
          variants={mobileItemVariants}
          whileHover={{ x: 4 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 25,
            staggerChildren: 0.1,
          }}
        >
          <Link
            href={item.href}
            onClick={() => setIsMobileMenuOpen(false)}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
              "hover:bg-accent hover:text-accent-foreground group",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground"
            )}
          >
            <div
              className={cn(
                "p-1.5 rounded-md transition-colors duration-200",
                isActive
                  ? "bg-primary-foreground/20"
                  : "bg-secondary group-hover:bg-secondary/80"
              )}
            >
              <item.icon className="h-3 w-3" />
            </div>
            <div className="flex flex-col flex-1">
              <span className="font-medium text-xs">{item.name}</span>
              {item.description && (
                <span className="text-xs opacity-70 mt-0">
                  {item.description}
                </span>
              )}
            </div>
            <ChevronRight className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
          </Link>
        </motion.div>
      );
    }

    // Desktop navigation - SIMPLIFIED without animations
    return (
      <div className="relative">
        <Link
          href={item.href}
          className={cn(
            "flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors duration-200",
            "hover:bg-accent hover:text-accent-foreground",
            isActive
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground"
          )}
          onMouseEnter={() => setHoveredItem(item.href)}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <item.icon className="h-4 w-4" />
          <span>{item.name}</span>
        </Link>
      </div>
    );
  };

  // Responsive desktop navigation
  const DesktopNavigation = () => (
    <nav className="hidden lg:flex items-center gap-2">
      {desktopNavItems.map((item) => (
        <NavigationLink key={item.href} item={item} />
      ))}
    </nav>
  );

  return (
    <>
      {/* Fixed header without animations */}
      <header
        className={cn(
          "fixed top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 transition-all duration-300",
          isScrolled && "border-border/50 shadow-sm"
        )}
      >
        <div className="container flex h-16 items-center justify-between px-4">
          {/* Logo and Mobile Menu */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu Trigger */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2"
            >
              <Menu className="h-12 w-12" />
            </Button>

            {/* Logo */}
            <Link
              href={
                userRole === "admin" ? "/dashboard/admin" : "/dashboard/staff"
              }
              className="flex items-center gap-3"
            >
              <Image
                src="/logo.png"
                alt="Logo"
                width={70}
                height={70}
                className="rounded"
              />
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-none block md:hidden lg:hidden">
                  سیستم قطعات
                </span>
                <span className="text-xs text-muted-foreground block md:hidden lg:hidden">
                  {userRole === "admin" ? "دشبورد ادمین" : "دشبورد کارمند"}
                </span>
                <span className="text-xs text-muted-foreground block md:hidden lg:hidden">
                  سیستم موجودی
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <DesktopNavigation />

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Theme Switcher */}
            <ModeSwitcher />

            {/* User Menu */}
            <div className="flex items-center gap-2">
              {/* User role indicator */}
              <div
                className={cn(
                  "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  userRole === "admin"
                    ? "bg-primary/20 text-primary border border-primary/20"
                    : "bg-secondary text-secondary-foreground"
                )}
              >
                {userRole === "admin" ? (
                  <>
                    <Settings className="h-3 w-3" />
                    ادمین
                  </>
                ) : (
                  <>
                    <Users className="h-3 w-3" />
                    کارمند
                  </>
                )}
              </div>

              {/* Logout */}
              <Logout />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu with animations */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop with full screen overlay */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Mobile Menu Panel - Full height overlay */}
            <motion.div
              className="fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-background border-l shadow-2xl lg:hidden overflow-hidden"
              variants={mobileMenuVariants}
              initial="closed"
              animate="open"
              exit="closed"
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <Image
                    src="/logo.png"
                    alt="Logo"
                    width={40}
                    height={40}
                    className="rounded"
                  />
                  <div className="flex flex-col">
                    <span className="font-bold text-md">سیستم قطعات</span>
                    <span className="text-xs text-muted-foreground">
                      {userRole === "admin" ? "دشبورد ادمین" : "دشبورد کارمند"}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="h-9 w-9 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Navigation Sections */}
              <div className="h-[calc(100vh-80px)] overflow-y-auto">
                <div className="space-y-3 p-2.5">
                  {mobileNavigationConfig.map((section, sectionIndex) => (
                    <motion.div
                      key={section.title}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: sectionIndex * 0.1 }}
                    >
                      <h4 className="text-xs font-semibold text-muted-foreground px-2 mb-2 flex items-center gap-2">
                        <div className="w-1 h-3 bg-primary rounded-full" />
                        {section.title}
                      </h4>
                      <div className="space-y-1">
                        {section.items.map((item) => (
                          <NavigationLink
                            key={item.href}
                            item={item}
                            isMobile={true}
                          />
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Footer Actions */}
                <div className="sticky bottom-0 border-t bg-background/80 backdrop-blur-sm p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ModeSwitcher />
                      <div
                        className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium capitalize",
                          userRole === "admin"
                            ? "bg-primary/20 text-primary"
                            : "bg-secondary text-secondary-foreground"
                        )}
                      >
                        {userRole === "admin" ? "ادمین" : "کارمند"}
                      </div>
                    </div>
                    <Logout />
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
