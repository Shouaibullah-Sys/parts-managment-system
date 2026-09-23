"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import Loader from "../loader";

const formSchema = z.object({
  username: z.string().min(3),
  email: z.email(),
  password: z.string().min(8),
});

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    const { error } = await authClient.signUp({
      email: values.email,
      password: values.password,
      name: values.username,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(
        "حساب با موفقیت ایجاد شد. لطفاً منتظر تایید مدیر باشید."
      );
      router.push("/login");
    }

    setIsLoading(false);
  }

  if (isLoading) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">خوش آمدید</CardTitle>
            <CardDescription>حساب کاربری جدید بسازید</CardDescription>
          </CardHeader>
          <CardContent>
            <Loader
              title="در حال ایجاد حساب..."
              subtitle="لطفاً منتظر بمانید"
              size="sm"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">خوش آمدید</CardTitle>
          <CardDescription>حساب کاربری جدید بسازید</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid gap-6">
                <div className="grid gap-6">
                  <div className="grid gap-3">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نام کاربری</FormLabel>
                          <FormControl>
                            <Input placeholder="احمد رحیمی" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ایمیل</FormLabel>
                          <FormControl>
                            <Input placeholder="m@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-3">
                    <div className="flex flex-col gap-2">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>رمز عبور</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="********"
                                {...field}
                                type="password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    ثبت نام
                  </Button>
                </div>
                <div className="text-center text-sm">
                  قبلا حساب داشتین؟{" "}
                  <Link href="/login" className="underline underline-offset-4">
                    ورود
                  </Link>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        با کلیک کردن روی ادامه، شما با ما موافقت میکنید{" "}
        <Link href="#">شرایط خدمات</Link> and{" "}
        <Link href="#">پالیسی حریم خصوصی</Link>.
      </div>
    </div>
  );
}
