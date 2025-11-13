import * as React from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Tailwind,
} from "@react-email/components";

interface VerifyEmailProps {
  username: string;
  verifyUrl: string;
}

const VerifyEmail = (props: VerifyEmailProps) => {
  const { username, verifyUrl } = props;
  return (
    <Html lang="fa" dir="rtl">
      <Tailwind>
        <Head />
        <Body className="bg-gray-100 font-sans py-10">
          <Container className="bg-white rounded-xl p-8 max-w-[600px] mx-auto">
            <Section>
              <Text className="text-[24px] font-bold text-gray-900 mb-4 mt-0">
                ایمیل خود را تأیید کنید
              </Text>

              <Text className="text-[16px] text-gray-700 mb-6 mt-0 leading-6">
                {username} عزیز، از ثبت نام شما متشکریم! برای تکمیل ثبت نام و
                ایمن سازی حساب کاربری تان، لطفاً ایمیل خود را با کلیک بر روی
                دکمه زیر تأیید کنید.
              </Text>

              <Section className="text-center mb-8">
                <Button
                  href={verifyUrl}
                  className="bg-blue-600 text-white px-8 py-3 rounded-[6px] text-[16px] font-medium no-underline box-border"
                >
                  تأیید ایمیل
                </Button>
              </Section>

              <Text className="text-[14px] text-gray-600 mb-6 mt-0 leading-5">
                اگر دکمه کار نکرد، می‌توانید این لینک را در مرورگر خود کپی و
                جایگذاری کنید:
                <br />
                {verifyUrl}
              </Text>

              <Text className="text-[14px] text-gray-600 mb-8 mt-0 leading-5">
                این لینک تأیید پس از ۲۴ ساعت منقضی می‌شود. اگر شما یک حساب
                کاربری ایجاد نکرده‌اید، می‌توانید این ایمیل را نادیده بگیرید.
              </Text>

              <Hr className="border-gray-200 my-6" />

              <Text className="text-[12px] text-gray-500 m-0 leading-4">
                با احترام،
                <br />
                تیم پشتیبانی
              </Text>
            </Section>

            <Section className="mt-8 pt-6 border-t border-gray-200">
              <Text className="text-[12px] text-gray-400 m-0 text-center leading-4">
                نام شرکت
                <br />
                خیابان تجارت ۱۲۳، مجموعه ۱۰۰
                <br />
                شهر، ولایت ۱۲۳۴۵
              </Text>

              <Text className="text-[12px] text-gray-400 m-0 text-center mt-2 leading-4">
                <a href="#" className="text-gray-400 underline">
                  لغو اشتراک
                </a>{" "}
                | © ۲۰۲۴ Diplomasi. تمام حقوق محفوظ است.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default VerifyEmail;
