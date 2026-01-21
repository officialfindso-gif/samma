'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Проверяем наличие токена авторизации
    const accessToken = localStorage.getItem('accessToken');
    
    if (accessToken) {
      // Если авторизован - перенаправляем в приложение
      router.push('/app');
    } else {
      // Если не авторизован - перенаправляем на страницу входа
      router.push('/login');
    }
  }, [router]);

  // Показываем загрузку во время проверки и редиректа
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Загрузка...</p>
      </div>
    </div>
  );
}
