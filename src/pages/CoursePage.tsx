import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Quiz } from '../components/Quiz';
import type { QuizData } from '../types';

export function CoursePage() {
  const { courseSlug } = useParams<{ courseSlug: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseSlug) {
      navigate('/');
      return;
    }

    const loadCourseData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 动态导入课程数据
        const module = await import(`../data/${courseSlug}.json`);
        setData(module.default as QuizData);
      } catch (err) {
        console.error('Failed to load course data:', err);
        setError('找不到该课程');
      } finally {
        setLoading(false);
      }
    };

    loadCourseData();
  }, [courseSlug, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-bg flex items-center justify-center">
        <div className="text-theme-text-muted">加载中...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-theme-bg flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-theme-text-muted mb-4">{error || '加载失败'}</div>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-theme-text text-theme-bg rounded-md hover:opacity-90 transition-opacity"
          >
            返回课程列表
          </button>
        </div>
      </div>
    );
  }

  return <Quiz data={data} />;
}

