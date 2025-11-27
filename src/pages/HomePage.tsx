import { useEffect, useState } from 'react';
import { CourseSelector } from '../components/CourseSelector';
import type { CourseIndex, CourseInfo } from '../types';

export function HomePage() {
  const [courses, setCourses] = useState<CourseInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadIndex = async () => {
      try {
        const module = await import('../data/index.json');
        const index = module.default as CourseIndex;
        setCourses(index.courses);
      } catch (err) {
        console.error('Failed to load course index:', err);
      } finally {
        setLoading(false);
      }
    };
    loadIndex();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-bg flex items-center justify-center">
        <div className="text-theme-text-muted">加载中...</div>
      </div>
    );
  }

  return <CourseSelector courses={courses} />;
}

