import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Sparkles,
  BookOpen,
  CheckCircle2,
  Edit2,
  Check,
  Lock,
  Cloud,
  RefreshCw,
  Sun,
  Moon,
} from 'lucide-react';
import {
  MedMindDatabase,
  LessonMindmap,
  LessonStudyStatus,
  ActiveRecallLevel,
  MindmapNode,
  NodeMasteryStatus,
  SupabaseConfig,
  AuthRole,
  CloudSyncStatus,
  SecuritySettings,
} from './types/mindmap';
import { INITIAL_MEDMIND_DATA } from './data/sampleLessons';
import {
  toggleNodeCollapseById,
  setTreeExpansionByLevel,
  updateNodeById,
  addChildNodeById,
  deleteNodeById,
  findNodeWithContext,
  calculateMasteryStats,
} from './utils/mindmapLayout';
import {
  getEffectiveSupabaseConfig,
  isSupabaseConfigured,
  pullDatabaseFromSupabase,
  pushDatabaseToSupabase,
  DEFAULT_OWNER_PASSWORD,
} from './utils/supabaseSync';
import { SidebarCurriculum } from './components/SidebarCurriculum';
import { MindmapCanvas } from './components/MindmapCanvas';
import { ClinicalDrawer } from './components/ClinicalDrawer';
import { AIImporterModal } from './components/AIImporterModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { AuthGateModal } from './components/AuthGateModal';
import { MedicalEssayStudioModal } from './components/MedicalEssayStudioModal';
import { A4PrintStudioModal } from './components/A4PrintStudioModal';

const STORAGE_KEY_DB = 'medmind_studio_db_v2';
const STORAGE_KEY_SUPABASE = 'medmind_studio_supabase_v1';
const STORAGE_KEY_AUTH_REMEMBER = 'medmind_studio_auth_session_v1';
const STORAGE_KEY_THEME = 'medmind_studio_theme_v1';

interface SavedAuthSession {
  role: AuthRole;
  tokenPassword?: string;
  savedAt: string;
}

export default function App() {
  // Load initial database from LocalStorage or fall back to 4-level sample lessons
  const [database, setDatabase] = useState<MedMindDatabase>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DB);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.lessons) && parsed.lessons.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback to default dataset
    }
    return INITIAL_MEDMIND_DATA;
  });

  // Load Theme Mode ('dark' | 'light') persisted in LocalStorage
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
    } catch {
      // ignore
    }
    return 'dark';
  });

  // Load effective Supabase Config (merges DEFAULT_SUPABASE_URL & KEY with LocalStorage)
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SUPABASE);
      if (raw) {
        return getEffectiveSupabaseConfig(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
    return getEffectiveSupabaseConfig(null);
  });

  // Load remembered authentication session from LocalStorage
  const [authRole, setAuthRole] = useState<AuthRole>(() => {
    try {
      const savedAuthRaw = localStorage.getItem(STORAGE_KEY_AUTH_REMEMBER);
      if (savedAuthRaw) {
        const parsedAuth = JSON.parse(savedAuthRaw) as SavedAuthSession;
        if (parsedAuth.role === 'owner' || parsedAuth.role === 'guest') {
          return parsedAuth.role;
        }
      }
    } catch {
      // ignore
    }
    return 'unauthenticated';
  });

  const [activeLessonId, setActiveLessonId] = useState<string>(() => {
    return database.lessons[0]?.id || 'lesson-cancer-characteristics';
  });

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('cancer-root');
  const [activeRecallLevel, setActiveRecallLevel] = useState<ActiveRecallLevel>('off');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isEssayStudioOpen, setIsEssayStudioOpen] = useState(false);
  const [isPrintStudioOpen, setIsPrintStudioOpen] = useState(false);
  const [editingLessonTitle, setEditingLessonTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>(() =>
    isSupabaseConfigured(supabaseConfig) ? 'synced' : 'local'
  );
  const [isPullingInitialCloud, setIsPullingInitialCloud] = useState(false);

  const isReadOnly = authRole === 'guest';
  const expectedOwnerPassword =
    database.security?.ownerPassword || DEFAULT_OWNER_PASSWORD;
  const allowGuestMode =
    database.security?.allowGuestMode !== undefined
      ? database.security.allowGuestMode
      : true;

  // Sync themeMode to localStorage & document root class
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_THEME, themeMode);
    } catch {
      // ignore
    }
    const rootEl = document.documentElement;
    if (themeMode === 'light') {
      rootEl.classList.add('theme-light');
    } else {
      rootEl.classList.remove('theme-light');
    }
  }, [themeMode]);

  // Save database to LocalStorage automatically
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(database));
    } catch {
      // ignore storage quota errors
    }
  }, [database]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  // Keyboard shortcut 'Z' for Zen Study Mode (Học Full Sạch Sẽ)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        isImporterOpen ||
        isCloudModalOpen ||
        isEssayStudioOpen ||
        isPrintStudioOpen ||
        editingLessonTitle
      ) {
        return;
      }

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((e.key === 'z' || e.key === 'Z') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsZenMode((prev) => {
          const next = !prev;
          showToast(
            next
              ? '⛶ Đã bật Chế độ Học Full Sạch Sẽ (Bấm phím Z để thoát)'
              : 'Đã thoát Chế độ Học Full Màn Hình'
          );
          return next;
        });
      } else if (e.key === 'Escape' && isZenMode) {
        setIsZenMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isImporterOpen,
    isCloudModalOpen,
    isEssayStudioOpen,
    isPrintStudioOpen,
    editingLessonTitle,
    isZenMode,
    showToast,
  ]);

  /**
   * Background Auto-Push helper for Owner actions when Supabase Auto-Sync is enabled
   */
  const autoPushTimerRef = useRef<number | null>(null);
  const triggerBackgroundCloudPush = useCallback(
    (nextDb: MedMindDatabase, cfg: SupabaseConfig = supabaseConfig) => {
      if (authRole !== 'owner') return;
      if (!isSupabaseConfigured(cfg) || !cfg.autoSync) return;

      setCloudSyncStatus('syncing');
      if (autoPushTimerRef.current) {
        window.clearTimeout(autoPushTimerRef.current);
      }

      autoPushTimerRef.current = window.setTimeout(async () => {
        const res = await pushDatabaseToSupabase(cfg, nextDb);
        if (res.ok) {
          setCloudSyncStatus('synced');
        } else {
          setCloudSyncStatus('error');
        }
      }, 650);
    },
    [authRole, supabaseConfig]
  );

  /**
   * Auto-Pull from Supabase on initial app mount
   */
  useEffect(() => {
    if (!isSupabaseConfigured(supabaseConfig)) return;

    let cancelled = false;
    setIsPullingInitialCloud(true);
    setCloudSyncStatus('syncing');

    pullDatabaseFromSupabase(supabaseConfig).then((res) => {
      if (cancelled) return;
      setIsPullingInitialCloud(false);

      if (res.ok && res.database) {
        setDatabase(res.database);
        setCloudSyncStatus('synced');

        setActiveLessonId((prevId) => {
          const exists = res.database!.lessons.some((l) => l.id === prevId);
          return exists ? prevId : res.database!.lessons[0]?.id || prevId;
        });

        try {
          const savedAuthRaw = localStorage.getItem(STORAGE_KEY_AUTH_REMEMBER);
          if (savedAuthRaw) {
            const parsed = JSON.parse(savedAuthRaw) as SavedAuthSession;
            const cloudPass =
              res.database.security?.ownerPassword || DEFAULT_OWNER_PASSWORD;
            if (
              parsed.role === 'owner' &&
              parsed.tokenPassword &&
              parsed.tokenPassword !== cloudPass
            ) {
              localStorage.removeItem(STORAGE_KEY_AUTH_REMEMBER);
              setAuthRole('unauthenticated');
            }
          }
        } catch {
          // ignore
        }
      } else {
        setCloudSyncStatus('local');
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Owner Login Handler
   */
  const handleOwnerLoginSuccess = async (
    rememberDevice: boolean,
    usedPassword: string
  ) => {
    setAuthRole('owner');
    if (rememberDevice) {
      const session: SavedAuthSession = {
        role: 'owner',
        tokenPassword: usedPassword,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY_AUTH_REMEMBER, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY_AUTH_REMEMBER);
    }

    if (isSupabaseConfigured(supabaseConfig)) {
      setCloudSyncStatus('syncing');
      const res = await pullDatabaseFromSupabase(supabaseConfig);
      if (res.ok && res.database) {
        setDatabase(res.database);
        if (res.database.lessons[0]) {
          setActiveLessonId(res.database.lessons[0].id);
          setSelectedNodeId(res.database.lessons[0].rootNode.id);
        }
        setCloudSyncStatus('synced');
        showToast('Đăng nhập Chủ sở hữu & tải dữ liệu mới nhất từ Supabase thành công!');
        return;
      }
    }

    showToast('Đã đăng nhập quyền Chủ sở hữu (Full Access)!');
  };

  /**
   * Guest Mode Handler (Read-Only)
   */
  const handleEnterGuestMode = (rememberDevice: boolean) => {
    setAuthRole('guest');
    if (rememberDevice) {
      const session: SavedAuthSession = {
        role: 'guest',
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY_AUTH_REMEMBER, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY_AUTH_REMEMBER);
    }
    showToast('Đang xem ở chế độ Khách (Chỉ đọc & Ôn tập).');
  };

  /**
   * Logout / Lock Screen Handler
   */
  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY_AUTH_REMEMBER);
    setAuthRole('unauthenticated');
  };

  const activeLesson: LessonMindmap = useMemo(() => {
    return (
      database.lessons.find((l) => l.id === activeLessonId) || database.lessons[0]
    );
  }, [database.lessons, activeLessonId]);

  const activeSystem = useMemo(
    () => database.systems.find((s) => s.id === activeLesson?.systemId),
    [database.systems, activeLesson]
  );

  const activeSubject = useMemo(
    () => database.subjects.find((s) => s.id === activeLesson?.subjectId),
    [database.subjects, activeLesson]
  );

  const masteryStats = useMemo(
    () => calculateMasteryStats(activeLesson.rootNode),
    [activeLesson.rootNode]
  );

  const selectedNodeContext = useMemo(() => {
    if (!selectedNodeId || !activeLesson) return null;
    return findNodeWithContext(activeLesson.rootNode, selectedNodeId);
  }, [activeLesson, selectedNodeId]);

  // Mutate the rootNode of the currently active lesson
  const updateActiveRootNode = (
    updater: (root: MindmapNode) => MindmapNode,
    shouldSyncToCloud = true
  ) => {
    setDatabase((prev) => {
      const nextDb: MedMindDatabase = {
        ...prev,
        lessons: prev.lessons.map((lesson) =>
          lesson.id === activeLesson.id
            ? {
                ...lesson,
                updatedAt: new Date().toISOString(),
                rootNode: updater(lesson.rootNode),
              }
            : lesson
        ),
      };
      if (shouldSyncToCloud && !isReadOnly) {
        triggerBackgroundCloudPush(nextDb);
      }
      return nextDb;
    });
  };

  const handleToggleCollapseNode = (nodeId: string) => {
    updateActiveRootNode((root) => toggleNodeCollapseById(root, nodeId), false);
  };

  const handleApplyLevelFilter = (maxVisibleLevel: number) => {
    updateActiveRootNode(
      (root) => setTreeExpansionByLevel(root, maxVisibleLevel),
      false
    );
    const levelLabel =
      maxVisibleLevel === 99
        ? 'Mở toàn bộ các cấp'
        : `Hiển thị đến Cấp ${maxVisibleLevel}`;
    showToast(levelLabel);
  };

  const handleUpdateNode = (
    nodeId: string,
    updater: (n: MindmapNode) => MindmapNode
  ) => {
    updateActiveRootNode((root) => updateNodeById(root, nodeId, updater), !isReadOnly);
  };

  const handleSetNodeMastery = (nodeId: string, mastery: NodeMasteryStatus) => {
    handleUpdateNode(nodeId, (n) => ({ ...n, mastery }));
  };

  const handleQuickAddChild = (parentId: string) => {
    if (isReadOnly) return;
    const newChild: MindmapNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: 'Nhánh kiến thức mới',
      mastery: 'untested',
      children: [],
    };
    updateActiveRootNode((root) => addChildNodeById(root, parentId, newChild), true);
    setSelectedNodeId(newChild.id);
    showToast('Đã thêm nhánh con mới. Hãy chỉnh sửa nội dung ở bảng bên phải.');
  };

  const handleAddChildFromDrawer = (parentId: string, child: MindmapNode) => {
    if (isReadOnly) return;
    updateActiveRootNode((root) => addChildNodeById(root, parentId, child), true);
    setSelectedNodeId(child.id);
    showToast(`Đã thêm nhánh "${child.label}"`);
  };

  const handleDeleteNode = (nodeId: string) => {
    if (isReadOnly) return;
    if (nodeId === activeLesson.rootNode.id) return;
    updateActiveRootNode((root) => deleteNodeById(root, nodeId), true);
    setSelectedNodeId(activeLesson.rootNode.id);
    showToast('Đã xóa nhánh khỏi sơ đồ tư duy.');
  };

  // Curriculum management handlers
  const handleCreateSystem = (name: string) => {
    if (isReadOnly) return;
    const newSysId = `sys-${Date.now()}`;
    const newSubId = `sub-${Date.now()}`;
    setDatabase((prev) => {
      const nextDb: MedMindDatabase = {
        ...prev,
        systems: [...prev.systems, { id: newSysId, name, iconName: 'BookOpen' }],
        subjects: [
          ...prev.subjects,
          { id: newSubId, systemId: newSysId, name: 'Học phần chung' },
        ],
      };
      triggerBackgroundCloudPush(nextDb);
      return nextDb;
    });
    showToast(`Đã tạo Hệ cơ quan "${name}"`);
  };

  const handleRenameSystem = (systemId: string, newName: string) => {
    if (isReadOnly || !newName.trim()) return;
    setDatabase((prev) => {
      const nextDb: MedMindDatabase = {
        ...prev,
        systems: prev.systems.map((s) =>
          s.id === systemId ? { ...s, name: newName.trim() } : s
        ),
      };
      triggerBackgroundCloudPush(nextDb);
      return nextDb;
    });
    showToast(`Đã đổi tên Hệ cơ quan thành "${newName.trim()}"`);
  };

  const handleDeleteSystem = (systemId: string) => {
    if (isReadOnly) return;
    if (database.systems.length <= 1) {
      showToast('Không thể xóa Hệ cơ quan cuối cùng.');
      return;
    }

    const remainingSystems = database.systems.filter((s) => s.id !== systemId);
    const remainingSubjects = database.subjects.filter(
      (sub) => sub.systemId !== systemId
    );
    const remainingLessons = database.lessons.filter(
      (l) => l.systemId !== systemId
    );

    if (remainingLessons.length === 0) {
      showToast('Không thể xóa vì kho dữ liệu phải còn ít nhất 1 bài học.');
      return;
    }

    setDatabase((prev) => {
      const nextDb: MedMindDatabase = {
        ...prev,
        systems: remainingSystems,
        subjects: remainingSubjects,
        lessons: remainingLessons,
      };
      triggerBackgroundCloudPush(nextDb);
      return nextDb;
    });

    if (!remainingLessons.some((l) => l.id === activeLessonId) && remainingLessons[0]) {
      setActiveLessonId(remainingLessons[0].id);
      setSelectedNodeId(remainingLessons[0].rootNode.id);
    }
    showToast('Đã xóa Hệ cơ quan và đồng bộ lên Cloud.');
  };

  const handleCreateSubject = (systemId: string, name: string) => {
    if (isReadOnly) return;
    const newSubId = `sub-${Date.now()}`;
    setDatabase((prev) => {
      const nextDb: MedMindDatabase = {
        ...prev,
        subjects: [...prev.subjects, { id: newSubId, systemId, name }],
      };
      triggerBackgroundCloudPush(nextDb);
      return nextDb;
    });
    showToast(`Đã thêm học phần "${name}"`);
  };

  const handleRenameSubject = (subjectId: string, newName: string) => {
    if (isReadOnly || !newName.trim()) return;
    setDatabase((prev) => {
      const nextDb: MedMindDatabase = {
        ...prev,
        subjects: prev.subjects.map((sub) =>
          sub.id === subjectId ? { ...sub, name: newName.trim() } : sub
        ),
      };
      triggerBackgroundCloudPush(nextDb);
      return nextDb;
    });
    showToast(`Đã đổi tên Học phần thành "${newName.trim()}"`);
  };

  const handleDeleteSubject = (subjectId: string) => {
    if (isReadOnly) return;
    if (database.subjects.length <= 1) {
      showToast('Không thể xóa Học phần cuối cùng.');
      return;
    }

    const remainingSubjects = database.subjects.filter((s) => s.id !== subjectId);
    const remainingLessons = database.lessons.filter(
      (l) => l.subjectId !== subjectId
    );

    if (remainingLessons.length === 0) {
      showToast('Không thể xóa vì kho dữ liệu phải còn ít nhất 1 bài học.');
      return;
    }

    setDatabase((prev) => {
      const nextDb: MedMindDatabase = {
        ...prev,
        subjects: remainingSubjects,
        lessons: remainingLessons,
      };
      triggerBackgroundCloudPush(nextDb);
      return nextDb;
    });

    if (!remainingLessons.some((l) => l.id === activeLessonId) && remainingLessons[0]) {
      setActiveLessonId(remainingLessons[0].id);
      setSelectedNodeId(remainingLessons[0].rootNode.id);
    }
    showToast('Đã xóa Học phần và đồng bộ lên Cloud.');
  };

  const handleRenameLesson = (lessonId: string, newTitle: string) => {
    if (isReadOnly || !newTitle.trim()) return;
    const cleanTitle = newTitle.trim();
    setDatabase((prev) => {
      const nextDb: MedMindDatabase = {
        ...prev,
        lessons: prev.lessons.map((l) =>
          l.id === lessonId
            ? {
                ...l,
                title: cleanTitle,
                updatedAt: new Date().toISOString(),
                rootNode: {
                  ...l.rootNode,
                  label: cleanTitle,
                },
              }
            : l
        ),
      };
      triggerBackgroundCloudPush(nextDb);
      return nextDb;
    });
    showToast(`Đã đổi tên bài học thành "${cleanTitle}"`);
  };

  const handleDeleteLesson = (lessonId: string) => {
    if (isReadOnly) return;
    if (database.lessons.length <= 1) {
      showToast('Phải giữ lại ít nhất 1 bài học trong kho dữ liệu.');
      return;
    }
    const remaining = database.lessons.filter((l) => l.id !== lessonId);
    setDatabase((prev) => {
      const nextDb: MedMindDatabase = {
        ...prev,
        lessons: remaining,
      };
      triggerBackgroundCloudPush(nextDb);
      return nextDb;
    });
    if (activeLessonId === lessonId && remaining[0]) {
      setActiveLessonId(remaining[0].id);
      setSelectedNodeId(remaining[0].rootNode.id);
    }
    showToast('Đã xóa bài học và cập nhật Cloud.');
  };

  const handleUpdateLessonStatus = (lessonId: string, status: LessonStudyStatus) => {
    if (isReadOnly) return;
    setDatabase((prev) => {
      const nextDb: MedMindDatabase = {
        ...prev,
        lessons: prev.lessons.map((l) =>
          l.id === lessonId ? { ...l, status } : l
        ),
      };
      triggerBackgroundCloudPush(nextDb);
      return nextDb;
    });
  };

  const handleImportLesson = (payload: {
    title: string;
    systemId: string;
    subjectId: string;
    tags: string[];
    rootNode: MindmapNode;
  }) => {
    if (isReadOnly) return;
    const newLesson: LessonMindmap = {
      id: `lesson-${Date.now()}`,
      title: payload.title,
      systemId: payload.systemId,
      subjectId: payload.subjectId,
      status: 'Đang ôn',
      tags: payload.tags,
      updatedAt: new Date().toISOString(),
      rootNode: payload.rootNode,
    };

    setDatabase((prev) => {
      const nextDb: MedMindDatabase = {
        ...prev,
        lessons: [newLesson, ...prev.lessons],
      };
      triggerBackgroundCloudPush(nextDb);
      return nextDb;
    });
    setActiveLessonId(newLesson.id);
    setSelectedNodeId(newLesson.rootNode.id);
    showToast(`Đã dựng sơ đồ tư duy "${newLesson.title}" & tự động đồng bộ Cloud!`);
  };

  const handleUpdateSecuritySettings = (newSecurity: SecuritySettings) => {
    if (isReadOnly) return;
    setDatabase((prev) => {
      const nextDb: MedMindDatabase = {
        ...prev,
        security: newSecurity,
      };
      triggerBackgroundCloudPush(nextDb);
      return nextDb;
    });

    try {
      const savedAuthRaw = localStorage.getItem(STORAGE_KEY_AUTH_REMEMBER);
      if (savedAuthRaw) {
        const parsed = JSON.parse(savedAuthRaw) as SavedAuthSession;
        if (parsed.role === 'owner') {
          localStorage.setItem(
            STORAGE_KEY_AUTH_REMEMBER,
            JSON.stringify({
              ...parsed,
              tokenPassword: newSecurity.ownerPassword,
            })
          );
        }
      }
    } catch {
      // ignore
    }
  };

  const handleExportDatabaseJson = () => {
    const blob = new Blob([JSON.stringify(database, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MedMind_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã tải xuống toàn bộ kho dữ liệu (.JSON)');
  };

  const handleExportCurrentLessonJson = () => {
    const blob = new Blob([JSON.stringify(activeLesson, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeLesson.title.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Đã xuất file JSON bài "${activeLesson.title}"`);
  };

  const handleImportDatabaseJson = (file: File) => {
    if (isReadOnly) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(String(e.target?.result));
        if (parsed.lessons && Array.isArray(parsed.lessons)) {
          setDatabase(parsed);
          setActiveLessonId(parsed.lessons[0].id);
          setSelectedNodeId(parsed.lessons[0].rootNode.id);
          triggerBackgroundCloudPush(parsed);
          showToast(`Khôi phục thành công ${parsed.lessons.length} bài học!`);
        } else if (parsed.rootNode || parsed.root) {
          const rootObj = parsed.rootNode || parsed.root;
          handleImportLesson({
            title: parsed.title || rootObj.label || rootObj.title || 'Bài học nhập từ file',
            systemId: activeLesson.systemId,
            subjectId: activeLesson.subjectId,
            tags: parsed.tags || ['Imported JSON'],
            rootNode: rootObj,
          });
        }
      } catch {
        showToast('File JSON không đúng định dạng MedMind Studio.');
      }
    };
    reader.readAsText(file);
  };

  const handleMergeSampleData = () => {
    if (isReadOnly) return;
    setDatabase((prev) => {
      const existingSysIds = new Set(prev.systems.map((s) => s.id));
      const existingSubIds = new Set(prev.subjects.map((s) => s.id));
      const existingLessonIds = new Set(prev.lessons.map((l) => l.id));

      const missingSystems = INITIAL_MEDMIND_DATA.systems.filter(
        (s) => !existingSysIds.has(s.id)
      );
      const missingSubjects = INITIAL_MEDMIND_DATA.subjects.filter(
        (s) => !existingSubIds.has(s.id)
      );
      const missingLessons = INITIAL_MEDMIND_DATA.lessons.filter(
        (l) => !existingLessonIds.has(l.id)
      );

      const nextDb: MedMindDatabase = {
        ...prev,
        systems: [...prev.systems, ...missingSystems],
        subjects: [...prev.subjects, ...missingSubjects],
        lessons: [...prev.lessons, ...missingLessons],
      };

      triggerBackgroundCloudPush(nextDb);
      return nextDb;
    });
    showToast(
      'Đã gộp thêm bài học mẫu bị thiếu (Giữ nguyên 100% các bài học bạn đã tạo)!'
    );
  };

  const handleSaveSupabaseConfig = (newCfg: SupabaseConfig) => {
    setSupabaseConfig(newCfg);
    localStorage.setItem(STORAGE_KEY_SUPABASE, JSON.stringify(newCfg));
    if (isSupabaseConfigured(newCfg)) {
      setCloudSyncStatus('synced');
    } else {
      setCloudSyncStatus('local');
    }
  };

  // RENDER LOGIN / PIN GATE WHEN UNAUTHENTICATED
  if (authRole === 'unauthenticated') {
    return (
      <AuthGateModal
        expectedPassword={expectedOwnerPassword}
        allowGuestMode={allowGuestMode}
        cloudConfigured={isSupabaseConfigured(supabaseConfig)}
        isPullingCloud={isPullingInitialCloud}
        onSuccessOwnerLogin={handleOwnerLoginSuccess}
        onEnterGuestMode={handleEnterGuestMode}
      />
    );
  }

  return (
    <div
      data-theme={themeMode}
      className={`w-screen h-screen bg-[#131314] text-[#e3e3e3] flex overflow-hidden ${
        themeMode === 'light' ? 'theme-light' : ''
      }`}
    >
      {/* LEFT 3-TIER MEDICAL SIDEBAR (Hidden when Zen Study Mode is active) */}
      {!isZenMode && (
        <SidebarCurriculum
          database={database}
          activeLessonId={activeLesson.id}
          isReadOnly={isReadOnly}
          onSelectLesson={(id) => {
            setActiveLessonId(id);
            const found = database.lessons.find((l) => l.id === id);
            if (found) setSelectedNodeId(found.rootNode.id);
          }}
          onCreateSystem={handleCreateSystem}
          onRenameSystem={handleRenameSystem}
          onDeleteSystem={handleDeleteSystem}
          onCreateSubject={handleCreateSubject}
          onRenameSubject={handleRenameSubject}
          onDeleteSubject={handleDeleteSubject}
          onRenameLesson={handleRenameLesson}
          onDeleteLesson={handleDeleteLesson}
          onUpdateLessonStatus={handleUpdateLessonStatus}
          onOpenImporter={() => !isReadOnly && setIsImporterOpen(true)}
          onOpenCloudModal={() => setIsCloudModalOpen(true)}
          onExportDatabaseJson={handleExportDatabaseJson}
          onImportDatabaseJson={handleImportDatabaseJson}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          cloudConnected={isSupabaseConfigured(supabaseConfig)}
        />
      )}

      {/* CENTER WORKSPACE COLUMN */}
      <div className="flex-1 h-full flex flex-col min-w-0 relative">
        {/* Top Context Header (Hidden when Zen Study Mode is active) */}
        {!isZenMode && (
          <header className="h-14 px-4 bg-[#1e1f20] border-b border-[#2d2e30] flex items-center justify-between gap-3 overflow-hidden shrink-0 z-20">
            {/* Zone 1: 3-Tier Curriculum Path & Editable Lesson Title */}
            <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
              <span
                title={`${activeSystem?.name || ''} / ${activeSubject?.name || ''}`}
                className="text-[12px] text-[#9aa0a6] truncate max-w-[180px] xl:max-w-[260px] shrink hidden md:inline"
              >
                {activeSystem?.name} / {activeSubject?.name} /
              </span>

              {editingLessonTitle && !isReadOnly ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (tempTitle.trim()) {
                      handleRenameLesson(activeLesson.id, tempTitle.trim());
                    }
                    setEditingLessonTitle(false);
                  }}
                  className="flex items-center gap-1.5 min-w-0"
                >
                  <input
                    type="text"
                    autoFocus
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    className="bg-[#131314] border border-[#8ab4f8] rounded px-2.5 py-1 text-[14px] font-display font-semibold text-white focus:outline-none w-56 max-w-full"
                  />
                  <button
                    type="submit"
                    className="p-1 rounded bg-[#8ab4f8] text-[#131314] shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                  <h2
                    title={activeLesson.title}
                    className="font-display font-bold text-[14.5px] text-white truncate"
                  >
                    {activeLesson.title}
                  </h2>
                  {!isReadOnly && (
                    <button
                      onClick={() => {
                        setTempTitle(activeLesson.title);
                        setEditingLessonTitle(true);
                      }}
                      title="Đổi tên bài học"
                      className="p-1 rounded hover:bg-[#2d2e30] text-[#9aa0a6] hover:text-white transition-colors shrink-0 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Zone 2: Clean Unboxed Mastery & Cloud Sync Status */}
            <div className="hidden lg:flex items-center gap-2 text-[12px] text-[#9aa0a6] whitespace-nowrap shrink-0">
              <span className="flex items-center gap-1 text-[#10b981] font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {masteryStats.mastered}/{masteryStats.total} thuộc ({masteryStats.percent}%)
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-[#f59e0b]">
                {masteryStats.review} cần ôn
              </span>
              <span aria-hidden="true">·</span>
              <button
                onClick={() => setIsCloudModalOpen(true)}
                className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
              >
                {cloudSyncStatus === 'syncing' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-[#8ab4f8] animate-spin" />
                    <span className="text-[#8ab4f8]">Đang đồng bộ Cloud...</span>
                  </>
                ) : cloudSyncStatus === 'synced' && isSupabaseConfigured(supabaseConfig) ? (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-[#10b981]" />
                    <span className="text-[#10b981]">Đã đồng bộ Cloud</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-[#9aa0a6]" />
                    <span>Lưu cục bộ (Local)</span>
                  </>
                )}
              </button>
            </div>

            {/* Zone 3: Quick Theme Toggle + Primary Actions + Lock / Logout Button */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Quick Light / Dark Theme Switcher Button */}
              <button
                onClick={() => {
                  const next = themeMode === 'dark' ? 'light' : 'dark';
                  setThemeMode(next);
                  showToast(
                    next === 'light'
                      ? '☀️ Đã chuyển sang Chế độ Sáng (Medical Paper Light - Chuẩn Sách Y Khoa)'
                      : '🌙 Đã chuyển sang Chế độ Tối (Dark Studio #131314)'
                  );
                }}
                title={
                  themeMode === 'dark'
                    ? 'Chuyển sang ☀️ Chế độ Sáng (Medical Paper Light)'
                    : 'Chuyển sang 🌙 Chế độ Tối (Dark Studio)'
                }
                className="px-2.5 py-1.5 rounded-lg border border-[#2d2e30] bg-[#131314] hover:bg-[#2d2e30] text-[12px] font-display font-semibold text-white flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                {themeMode === 'light' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-[#f59e0b]" />
                    <span>☀️ Sáng</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-[#8ab4f8]" />
                    <span>🌙 Tối</span>
                  </>
                )}
              </button>

              <button
                onClick={() =>
                  setSelectedNodeId(
                    selectedNodeId ? null : activeLesson.rootNode.id
                  )
                }
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                  selectedNodeId
                    ? 'bg-[#2d2e30] border-[#8ab4f8]/50 text-white'
                    : 'bg-[#131314] border-[#2d2e30] text-[#9aa0a6] hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-[#8ab4f8]" />
                <span>Bảng Lâm sàng</span>
              </button>

              {!isReadOnly && (
                <button
                  onClick={() => setIsImporterOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#131314] font-display font-semibold text-[12.5px] flex items-center gap-1.5 shadow-sm transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>+ Nhập bài học từ AI</span>
                </button>
              )}

              <button
                onClick={handleLogout}
                title={
                  isReadOnly
                    ? 'Đang ở chế độ Khách · Bấm để chuyển sang Đăng nhập Chủ sở hữu'
                    : 'Khóa màn hình / Đăng xuất'
                }
                className={`px-2.5 py-1.5 rounded-lg border text-[12px] font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                  isReadOnly
                    ? 'bg-[#f59e0b]/15 border-[#f59e0b]/40 text-[#fdd663] hover:bg-[#f59e0b]/25'
                    : 'bg-[#131314] border-[#2d2e30] text-[#9aa0a6] hover:text-white hover:bg-[#2d2e30]'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {isReadOnly ? 'Khách (Đăng nhập)' : 'Khóa'}
                </span>
              </button>
            </div>
          </header>
        )}

        {/* Interactive 6-Mode Mindmap Canvas with Fixed h-11 Sub-Header & Zen Mode */}
        <MindmapCanvas
          rootNode={activeLesson.rootNode}
          selectedNodeId={selectedNodeId}
          isReadOnly={isReadOnly}
          themeMode={themeMode}
          isZenMode={isZenMode}
          onToggleZenMode={() => {
            setIsZenMode((prev) => {
              const next = !prev;
              showToast(
                next
                  ? '⛶ Đã bật Chế độ Học Full Sạch Sẽ (Bấm phím Z để thoát)'
                  : 'Đã thoát Chế độ Học Full Màn Hình'
              );
              return next;
            });
          }}
          onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
          onToggleCollapse={handleToggleCollapseNode}
          onQuickAddChild={handleQuickAddChild}
          onSetNodeMastery={handleSetNodeMastery}
          onApplyLevelFilter={handleApplyLevelFilter}
          activeRecallLevel={activeRecallLevel}
          onChangeActiveRecall={setActiveRecallLevel}
          onExportCurrentLessonJson={handleExportCurrentLessonJson}
          onOpenEssayStudio={() => setIsEssayStudioOpen(true)}
          onOpenPrintStudio={() => setIsPrintStudioOpen(true)}
        />

        {/* Toast Feedback Banner */}
        {toastMessage && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-[#3f3c5c] border border-[#8ab4f8] text-white text-[12.5px] font-medium shadow-xl pointer-events-none">
            {toastMessage}
          </div>
        )}
      </div>

      {/* RIGHT MEDICAL CLINICAL DRAWER */}
      {selectedNodeContext && !isZenMode && (
        <ClinicalDrawer
          node={selectedNodeContext.node}
          depth={selectedNodeContext.depth}
          breadcrumb={selectedNodeContext.breadcrumb}
          isReadOnly={isReadOnly}
          onClose={() => setSelectedNodeId(null)}
          onSelectBreadcrumbNode={(id) => setSelectedNodeId(id)}
          onUpdateNode={handleUpdateNode}
          onAddChildNode={handleAddChildFromDrawer}
          onDeleteNode={handleDeleteNode}
        />
      )}

      {/* 3-TAB AI IMPORTER MODAL (Owner only) */}
      {isImporterOpen && !isReadOnly && (
        <AIImporterModal
          systems={database.systems}
          subjects={database.subjects}
          defaultSystemId={activeLesson.systemId}
          defaultSubjectId={activeLesson.subjectId}
          onClose={() => setIsImporterOpen(false)}
          onImportLesson={handleImportLesson}
        />
      )}

      {/* SUPABASE CLOUD SYNC, THEME & SECURITY MODAL */}
      {isCloudModalOpen && (
        <CloudSyncModal
          config={supabaseConfig}
          database={database}
          isReadOnly={isReadOnly}
          themeMode={themeMode}
          onChangeThemeMode={(newTheme) => {
            setThemeMode(newTheme);
          }}
          onSaveConfig={handleSaveSupabaseConfig}
          onReplaceDatabase={(newDb) => {
            setDatabase(newDb);
            if (newDb.lessons[0]) {
              setActiveLessonId(newDb.lessons[0].id);
              setSelectedNodeId(newDb.lessons[0].rootNode.id);
            }
          }}
          onUpdateSecuritySettings={handleUpdateSecuritySettings}
          onMergeSampleData={handleMergeSampleData}
          onClose={() => setIsCloudModalOpen(false)}
        />
      )}

      {/* MEDICAL ESSAY & RUBRIC STUDIO MODAL (BAREM 0.25đ - 0.5đ) */}
      {isEssayStudioOpen && (
        <MedicalEssayStudioModal
          lessonId={activeLesson.id}
          lessonTitle={activeLesson.title}
          rootNode={activeLesson.rootNode}
          onClose={() => setIsEssayStudioOpen(false)}
          onSetNodeMastery={handleSetNodeMastery}
          onOpenPrintStudio={() => {
            setIsEssayStudioOpen(false);
            setIsPrintStudioOpen(true);
          }}
        />
      )}

      {/* A4 PRINT & PDF WORKSHEET STUDIO MODAL */}
      {isPrintStudioOpen && (
        <A4PrintStudioModal
          database={database}
          activeLessonId={activeLesson.id}
          lessonTitle={activeLesson.title}
          systemName={activeSystem?.name}
          subjectName={activeSubject?.name}
          rootNode={activeLesson.rootNode}
          onClose={() => setIsPrintStudioOpen(false)}
        />
      )}
    </div>
  );
}
