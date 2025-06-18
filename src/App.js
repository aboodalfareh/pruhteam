import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, onSnapshot, updateDoc, deleteDoc, query, where, getDocs, serverTimestamp, runTransaction } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LayoutDashboard, FileText, Users, Briefcase, Settings, PlusCircle, X, ChevronDown, Edit, Trash2, ArrowRight, Sun, Moon, LogOut, User, Lock, ClipboardCheck, Download } from 'lucide-react';

// --- Helper to load external scripts ---
const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Script load error for ${src}`));
    document.head.appendChild(script);
  });
};


// --- Firebase Configuration ---
const firebaseConfig = typeof __firebase_config !== 'undefined' 
    ? JSON.parse(__firebase_config) 
    : { apiKey: "DEMO_API_KEY", authDomain: "DEMO_AUTH_DOMAIN", projectId: "DEMO_PROJECT_ID" };

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-pro-team-app';

// --- Firebase Initialization ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Main App Component ---
export default function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [theme, setTheme] = useState('light');
    
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!auth.currentUser) {
                try {
                    await signInAnonymously(auth);
                } catch(error) {
                    console.error("Anonymous sign-in failed", error);
                }
            }
            setIsAuthReady(true);
        });
        
        Promise.all([
            loadScript("https://unpkg.com/docx@8.5.0/dist/docx.js"),
            loadScript("https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.0/FileSaver.min.js")
        ]).catch(error => console.error("Error loading scripts:", error));

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('dir', 'rtl');
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };
    
    const handleLoginSuccess = (user) => {
        setCurrentUser(user);
    };

    const handleLogout = () => {
        setCurrentUser(null);
    }

    if (!isAuthReady) {
        return <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900"><div className="loader"></div></div>;
    }

    return (
        <div className={`h-screen bg-gray-100 dark:bg-gray-900 font-sans ${theme}`}>
            {currentUser ? <MainApp user={currentUser} onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} /> : <AuthPage onLoginSuccess={handleLoginSuccess} />}
        </div>
    );
}

const AuthPage = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // This is a custom authentication flow built on top of Firestore
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const profilesCollection = collection(db, `artifacts/${appId}/public/data/profiles`);

        try {
            const q = query(profilesCollection, where("username", "==", username.toLowerCase()));
            const querySnapshot = await getDocs(q);

            if (isLogin) {
                if (querySnapshot.empty) {
                    setError('اسم المستخدم غير موجود.');
                } else {
                    const userDoc = querySnapshot.docs[0].data();
                    if (userDoc.password === password) {
                        onLoginSuccess({ username: userDoc.username });
                    } else {
                        setError('كلمة المرور غير صحيحة.');
                    }
                }
            } else {
                if (!querySnapshot.empty) {
                    setError('اسم المستخدم هذا مستخدم بالفعل.');
                } else if (password.length < 6) {
                    setError('كلمة المرور يجب أن تتكون من 6 أحرف على الأقل.');
                } else if (!/^[a-zA-Z0-9]+$/.test(username)) {
                    setError('اسم المستخدم يجب أن يحتوي على أحرف وأرقام إنجليزية فقط.');
                } else {
                    await addDoc(profilesCollection, {
                        username: username.toLowerCase(),
                        password: password,
                        createdAt: serverTimestamp()
                    });
                    onLoginSuccess({ username: username.toLowerCase() });
                }
            }
        } catch (err) {
            console.error("Custom Auth Error:", err);
            setError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-lg dark:bg-gray-800">
                <div className="text-center">
                     <div className="flex items-center justify-center mb-4">
                        <ArrowRight className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mr-2">الفريق المحترف</h1>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-600 dark:text-gray-300">
                        {isLogin ? 'تسجيل الدخول إلى حسابك' : 'إنشاء حساب جديد'}
                    </h2>
                </div>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="relative">
                        <User className="absolute top-3 right-3 text-gray-400" size={20} />
                        <input type="text" placeholder="اسم المستخدم (أحرف إنجليزية)" value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full p-3 pr-10 text-gray-700 bg-gray-100 border border-gray-300 rounded-md dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    </div>
                     <div className="relative">
                        <Lock className="absolute top-3 right-3 text-gray-400" size={20} />
                        <input type="password" placeholder="كلمة المرور (6 أحرف على الأقل)" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-3 pr-10 text-gray-700 bg-gray-100 border border-gray-300 rounded-md dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    </div>
                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                    <button type="submit" disabled={loading} className="w-full py-3 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed">
                        {loading ? 'الرجاء الانتظار...' : (isLogin ? 'تسجيل الدخول' : 'إنشاء حساب')}
                    </button>
                </form>
                <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                    {isLogin ? 'ليس لديك حساب؟' : 'هل لديك حساب بالفعل؟'}{' '}
                    <button onClick={() => setIsLogin(!isLogin)} className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
                        {isLogin ? 'إنشاء حساب' : 'تسجيل الدخول'}
                    </button>
                </p>
            </div>
        </div>
    );
};

const MainApp = ({ user, onLogout, theme, toggleTheme }) => {
    const [page, setPage] = useState('dashboard');
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const renderPage = () => {
        const username = user.username;
        switch (page) {
            case 'dashboard': return <Dashboard setPage={setPage} username={username} />;
            case 'invoices': return <Invoices username={username} />;
            case 'customers': return <Customers username={username} />;
            case 'services': return <Services username={username} />;
            case 'vouchers': return <PaymentVouchers username={username} />;
            default: return <Dashboard setPage={setPage} username={username} />;
        }
    };
    
    return (
        <div className="flex h-screen">
            <Sidebar page={page} setPage={setPage} isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} toggleTheme={toggleTheme} theme={theme} user={user} onLogout={onLogout}/>
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 p-4 md:p-6 lg:p-8">
                    {renderPage()}
                </main>
            </div>
        </div>
    )
}

// --- Components ---

const Sidebar = ({ page, setPage, isMenuOpen, setIsMenuOpen }) => {
    const navigate = (pageName) => {
        setPage(pageName);
        setIsMenuOpen(false);
    };

    const navItems = [
        { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
        { id: 'invoices', label: 'الفواتير', icon: FileText },
        { id: 'vouchers', label: 'سندات القبض', icon: ClipboardCheck },
        { id: 'customers', label: 'العملاء', icon: Users },
        { id: 'services', label: 'الخدمات', icon: Briefcase },
        { id: 'settings', label: 'الإعدادات', icon: Settings },
    ];

    return (
        <aside className={`absolute md:relative z-20 bg-white dark:bg-gray-800 shadow-lg h-full w-64 md:w-60 lg:w-64 transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out`}>
            <div className="p-6 flex flex-col h-full">
                <div className="flex items-center justify-center pb-6 border-b border-gray-200 dark:border-gray-700">
                    <ArrowRight className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white mr-2">الفريق المحترف</h1>
                </div>
                <nav className="mt-6 flex-1">
                    <ul>
                        {navItems.map(item => (
                            <li key={item.id} className="mb-2">
                                <a href="#" onClick={(e) => {e.preventDefault(); navigate(item.id);}} className={`flex items-center py-3 px-4 rounded-lg transition-colors duration-200 ${page === item.id ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                                    <item.icon className="w-5 h-5" />
                                    <span className="mr-4 font-medium">{item.label}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
                 <div className="p-4 mt-auto">
                     <p className="text-xs text-center text-gray-400 dark:text-gray-500">© 2025 الفريق المحترف</p>
                </div>
            </div>
        </aside>
    );
};

const Header = ({ isMenuOpen, setIsMenuOpen, toggleTheme, theme, user, onLogout }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    
    const displayUsername = user.username;
    const avatarLetter = displayUsername.length > 0 ? displayUsername[0].toUpperCase() : 'U';

    return (
        <header className="bg-white dark:bg-gray-800 shadow-sm p-4 flex items-center justify-between md:justify-end z-10">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-gray-600 dark:text-gray-300">
                {isMenuOpen ? <X /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>}
            </button>
            <div className="flex items-center space-x-4">
                 <button onClick={toggleTheme} className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700">
                    {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>
                <div className="relative">
                    <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center space-x-2">
                        <img className="h-9 w-9 rounded-full object-cover" src={`https://placehold.co/100x100/E2E8F0/4A5568?text=${avatarLetter}`} alt="User avatar" />
                        <span className="hidden sm:inline font-medium text-gray-700 dark:text-gray-200">{displayUsername}</span>
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                    </button>
                     {dropdownOpen && (
                        <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg py-1 z-20">
                            <button onClick={onLogout} className="w-full text-right flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600">
                                <LogOut className="ml-2" size={16} />
                                تسجيل الخروج
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

const Dashboard = ({ setPage, username }) => {
    const [stats, setStats] = useState({ sales: 0, profit: 0, customers: 0, invoices: 0 });
    const [recentInvoices, setRecentInvoices] = useState([]);
    const [salesData, setSalesData] = useState([]);
    
    useEffect(() => {
        if (!username) return;
        
        const dataPath = `artifacts/${appId}/public/data/userdata/${username}`;

        const invoicesQuery = query(collection(db, `${dataPath}/invoices`));
        const unsubscribeInvoices = onSnapshot(invoicesQuery, (querySnapshot) => {
            const allInvoices = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            const totalSales = allInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
            
            setRecentInvoices(allInvoices.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5));
            
            const monthlySales = {};
            const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
            allInvoices.forEach(inv => {
                const monthIndex = new Date(inv.date).getMonth();
                const monthName = monthNames[monthIndex];
                if (!monthlySales[monthName]) {
                    monthlySales[monthName] = { name: monthName, sales: 0 };
                }
                monthlySales[monthName].sales += Number(inv.total);
            });
            
            const chartData = Object.values(monthlySales);
            setSalesData(chartData);

            setStats(prevStats => ({
                ...prevStats,
                sales: totalSales,
                profit: totalSales * 0.25, // Assuming 25% profit margin for demo
                invoices: allInvoices.length
            }));
        }, (error) => { console.error("Error in invoices listener:", error) });

        const customersQuery = query(collection(db, `${dataPath}/customers`));
        const unsubscribeCustomers = onSnapshot(customersQuery, (querySnapshot) => {
            setStats(prevStats => ({ ...prevStats, customers: querySnapshot.size }));
        }, (error) => { console.error("Error in customers listener:", error) });

        return () => {
            unsubscribeInvoices();
            unsubscribeCustomers();
        };
    }, [username]);


    const statCards = [
        { title: 'إجمالي الإيرادات', value: `ر.س ${stats.sales.toLocaleString()}`, icon: '💰', color: 'bg-blue-500' },
        { title: 'الأرباح', value: `ر.س ${stats.profit.toLocaleString()}`, icon: '📈', color: 'bg-green-500' },
        { title: 'العملاء', value: stats.customers, icon: '👥', color: 'bg-yellow-500' },
        { title: 'الفواتير', value: stats.invoices, icon: '🧾', color: 'bg-indigo-500' },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map(card => (
                    <div key={card.title} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.title}</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">{card.value}</p>
                        </div>
                        <div className={`text-2xl ${card.color} text-white rounded-full p-3`}>
                            {card.icon}
                        </div>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-4">نظرة عامة على الإيرادات</h3>
                     <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={salesData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                            <XAxis dataKey="name" stroke="#9CA3AF"/>
                            <YAxis stroke="#9CA3AF"/>
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: 'rgba(128, 128, 128, 0.5)', color: '#FFFFFF' }}/>
                            <Legend />
                            <Bar dataKey="sales" name="الإيرادات" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-4">الوصول السريع</h3>
                    <div className="space-y-4">
                        <button onClick={() => setPage('invoices')} className="w-full flex items-center justify-center bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-all duration-200">
                            <PlusCircle className="mr-2" size={20}/> فاتورة جديدة
                        </button>
                        <button onClick={() => setPage('customers')} className="w-full flex items-center justify-center bg-green-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-green-700 transition-all duration-200">
                            <PlusCircle className="mr-2" size={20}/> عميل جديد
                        </button>
                        <button onClick={() => setPage('services')} className="w-full flex items-center justify-center bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-gray-800 transition-all duration-200">
                            <PlusCircle className="mr-2" size={20}/> خدمة جديدة
                        </button>
                    </div>
                </div>
            </div>
             <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-4">أحدث الفواتير</h3>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">رقم الفاتورة</th>
                                <th scope="col" className="px-6 py-3">العميل</th>
                                <th scope="col" className="px-6 py-3">التاريخ</th>
                                <th scope="col" className="px-6 py-3">الإجمالي</th>
                                <th scope="col" className="px-6 py-3">الحالة</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentInvoices.length > 0 ? (
                                recentInvoices.map(invoice => (
                                    <tr key={invoice.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">#{invoice.invoiceNumber}</td>
                                        <td className="px-6 py-4">{invoice.customerName}</td>
                                        <td className="px-6 py-4">{invoice.date}</td>
                                        <td className="px-6 py-4 font-semibold">ر.س {invoice.total.toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={invoice.status} />
                                        </td>
                                    </tr>
                                ))
                             ) : (
                                <tr>
                                    <td colSpan="5" className="text-center py-10 text-gray-500 dark:text-gray-400">
                                        لا توجد فواتير لعرضها.
                                    </td>
                                </tr>
                             )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


// Generic Modal Component
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div dir="rtl" className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24} /></button>
                </div>
                <div className="p-6 overflow-y-auto">{children}</div>
            </div>
        </div>
    );
};


// Status Badge Component
const StatusBadge = ({ status }) => {
    const statusStyles = {
        'مدفوعة': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        'مدفوعة جزئياً': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        'قيد الانتظار': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        'متأخرة': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    return ( <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span> );
};

// --- CRUD Components (Invoices, Customers, Services, Vouchers) ---

const Invoices = ({username}) => {
    const [invoices, setInvoices] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentInvoice, setCurrentInvoice] = useState(null);
    const [vouchersModalOpen, setVouchersModalOpen] = useState(false);
    const [selectedInvoiceForVouchers, setSelectedInvoiceForVouchers] = useState(null);
    const dataPath = `artifacts/${appId}/public/data/userdata/${username}`;

    useEffect(() => {
        if (!username) return;
        const invoicesCollection = collection(db, `${dataPath}/invoices`);
        const unsubscribe = onSnapshot(invoicesCollection, (snapshot) => {
            const invoicesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setInvoices(invoicesData);
        });
        return () => unsubscribe();
    }, [username]);
    
    const handleAdd = () => { setCurrentInvoice(null); setIsModalOpen(true); };
    const handleEdit = (invoice) => { setCurrentInvoice(invoice); setIsModalOpen(true); };

    const handleDelete = async (id) => {
       if (window.confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) {
         await deleteDoc(doc(db, `${dataPath}/invoices`, id));
       }
    };
    
    const handleSave = async (invoiceData) => {
        const invoicesCollection = collection(db, `${dataPath}/invoices`);
        const dataToSave = {
            ...invoiceData,
            total: Number(invoiceData.total),
            paidAmount: Number(invoiceData.paidAmount) || 0,
        };
        dataToSave.remainingAmount = dataToSave.total - dataToSave.paidAmount;

        if (currentInvoice && currentInvoice.id) {
            const invoiceDoc = doc(db, `${dataPath}/invoices`, currentInvoice.id);
            await updateDoc(invoiceDoc, dataToSave);
        } else {
            const newInvoiceNumber = invoices.length > 0 ? Math.max(...invoices.map(i => i.invoiceNumber)) + 1 : 1001;
            await addDoc(invoicesCollection, {...dataToSave, invoiceNumber: newInvoiceNumber, status: 'قيد الانتظار' });
        }
        setIsModalOpen(false);
    };
    
    const showVouchers = (invoice) => {
        setSelectedInvoiceForVouchers(invoice);
        setVouchersModalOpen(true);
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">إدارة الفواتير</h2>
                <button onClick={handleAdd} className="flex items-center bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-colors"><PlusCircle className="mr-2" size={20}/> إضافة فاتورة</button>
            </div>
            <div className="overflow-x-auto">
                 <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">العميل</th>
                            <th className="px-4 py-3">الإجمالي</th>
                            <th className="px-4 py-3">المدفوع</th>
                            <th className="px-4 py-3">المتبقي</th>
                            <th className="px-4 py-3">الحالة</th>
                            <th className="px-4 py-3 text-left">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.length > 0 ? (
                            invoices.map(invoice => {
                                const remaining = (invoice.total || 0) - (invoice.paidAmount || 0);
                                return (
                                <tr key={invoice.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">INV-{invoice.invoiceNumber}</td>
                                    <td className="px-4 py-3">{invoice.customerName}</td>
                                    <td className="px-4 py-3">ر.س {Number(invoice.total || 0).toLocaleString()}</td>
                                    <td className="px-4 py-3">ر.س {Number(invoice.paidAmount || 0).toLocaleString()}</td>
                                    <td className="px-4 py-3 font-semibold">ر.س {Number(remaining).toLocaleString()}</td>
                                    <td className="px-4 py-3"><StatusBadge status={invoice.status} /></td>
                                    <td className="px-4 py-3 flex items-center space-x-2 justify-end">
                                        {invoice.paidAmount > 0 && <button onClick={() => showVouchers(invoice)} title="عرض السندات" className="p-2 text-green-600 hover:text-green-800"><ClipboardCheck size={18}/></button>}
                                        <button onClick={() => handleEdit(invoice)} className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"><Edit size={18}/></button>
                                        <button onClick={() => handleDelete(invoice.id)} className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"><Trash2 size={18}/></button>
                                    </td>
                                </tr>
                            )})
                        ) : (
                             <tr>
                                <td colSpan="7" className="text-center py-16 text-gray-500 dark:text-gray-400">
                                    <FileText size={48} className="mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold">لا توجد فواتير بعد</h3>
                                    <p className="mt-2">ابدأ بإضافة فاتورتك الأولى لتتبع مبيعاتك.</p>
                                    <button onClick={handleAdd} className="mt-4 flex items-center mx-auto bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-colors">
                                        <PlusCircle className="mr-2" size={20}/> إضافة فاتورة جديدة
                                    </button>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <InvoiceForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} invoice={currentInvoice} username={username} />
            {selectedInvoiceForVouchers && <VouchersForInvoiceModal isOpen={vouchersModalOpen} onClose={() => setVouchersModalOpen(false)} invoice={selectedInvoiceForVouchers} username={username} />}
        </div>
    );
};

const VouchersForInvoiceModal = ({ isOpen, onClose, invoice, username }) => {
    const [vouchers, setVouchers] = useState([]);

    useEffect(() => {
        if (!isOpen) return;
        const dataPath = `artifacts/${appId}/public/data/userdata/${username}`;
        const vouchersQuery = query(collection(db, `${dataPath}/vouchers`), where("invoiceId", "==", invoice.id));
        const unsubscribe = onSnapshot(vouchersQuery, (snapshot) => {
            setVouchers(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
        });
        return () => unsubscribe();
    }, [isOpen, invoice, username]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`سندات القبض للفاتورة INV-${invoice.invoiceNumber}`}>
            {vouchers.length > 0 ? (
                <ul className="space-y-3">
                    {vouchers.map(voucher => (
                        <li key={voucher.id} className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md flex justify-between items-center">
                            <div>
                                <p className="font-semibold">ر.س {Number(voucher.amount).toLocaleString()}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(voucher.date).toLocaleDateString('ar-SA')}</p>
                            </div>
                            <span className="text-xs font-bold text-green-600">VCH-{voucher.voucherNumber}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">لا توجد سندات قبض لهذه الفاتورة.</p>
            )}
        </Modal>
    );
};


const InvoiceForm = ({ isOpen, onClose, onSave, invoice, username }) => {
    const [customers, setCustomers] = useState([]);
    const [services, setServices] = useState([]);
    const [formData, setFormData] = useState({ customerId: '', customerName: '', date: new Date().toISOString().slice(0, 10), items: [{ serviceId:'', name: '', quantity: 1, price: 0 }], total: 0 });
    const dataPath = `artifacts/${appId}/public/data/userdata/${username}`;

    useEffect(() => {
        if (!isOpen || !username) return;
        const customersCollection = collection(db, `${dataPath}/customers`);
        getDocs(customersCollection).then(snapshot => {
            setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        const servicesCollection = collection(db, `${dataPath}/services`);
        getDocs(servicesCollection).then(snapshot => {
            setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
    }, [isOpen, username]);

    useEffect(() => {
        if (invoice) { setFormData({ ...invoice, items: invoice.items || [{ serviceId:'', name: '', quantity: 1, price: 0 }] });
        } else { setFormData({ customerId: '', customerName: '', date: new Date().toISOString().slice(0, 10), items: [{ serviceId:'', name: '', quantity: 1, price: 0 }], total: 0 }); }
    }, [invoice]);
    
    const calculateTotal = useCallback((items) => { return items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price)), 0); }, []);

    useEffect(() => { const newTotal = calculateTotal(formData.items); setFormData(prev => ({ ...prev, total: newTotal })); }, [formData.items, calculateTotal]);

    const handleCustomerChange = (e) => {
        const customerId = e.target.value;
        const customer = customers.find(c => c.id === customerId);
        setFormData(prev => ({ ...prev, customerId: customerId, customerName: customer ? customer.name : ''}));
    };

    const handleServiceChange = (index, e) => {
        const serviceId = e.target.value;
        const service = services.find(s => s.id === serviceId);
        const newItems = [...formData.items];
        if(service){
            newItems[index] = { ...newItems[index], serviceId: service.id, name: service.name, price: service.price };
        } else {
             newItems[index] = { ...newItems[index], serviceId: '', name: '', price: 0 };
        }
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const handleQuantityChange = (index, e) => {
        const newItems = [...formData.items];
        newItems[index].quantity = Number(e.target.value);
        setFormData(prev => ({...prev, items: newItems}));
    }

    const addItem = () => { setFormData(prev => ({ ...prev, items: [...prev.items, { serviceId: '', name: '', quantity: 1, price: 0 }] })); };
    const removeItem = (index) => { const items = formData.items.filter((_, i) => i !== index); setFormData(prev => ({ ...prev, items })); };
    const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={invoice ? "تعديل فاتورة" : "فاتورة جديدة"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العميل</label>
                    <select name="customerId" value={formData.customerId} onChange={handleCustomerChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" required>
                        <option value="">اختر عميلاً...</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">التاريخ</label>
                    <input type="date" name="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                </div>
                <h4 className="font-semibold pt-4 border-t dark:border-gray-700">البنود / الخدمات</h4>
                {formData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                        <select value={item.serviceId} onChange={(e) => handleServiceChange(index, e)} className="col-span-6 p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <option value="">اختر خدمة...</option>
                            {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <input type="number" name="quantity" value={item.quantity} onChange={(e) => handleQuantityChange(index, e)} placeholder="الكمية" className="col-span-2 p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        <input type="number" name="price" value={item.price} readOnly placeholder="السعر" className="col-span-3 p-2 border rounded-md bg-gray-200 dark:bg-gray-600 dark:border-gray-500 dark:text-white" />
                        <button type="button" onClick={() => removeItem(index)} className="col-span-1 p-2 text-red-500 hover:bg-red-100 rounded-full flex justify-center items-center"><Trash2 size={16}/></button>
                    </div>
                ))}
                 <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:underline">+ إضافة بند آخر</button>
                 <div className="pt-4 border-t dark:border-gray-700 text-right"><p className="text-lg font-bold">الإجمالي: ر.س {formData.total.toLocaleString()}</p></div>
                <div className="flex justify-end pt-4"><button type="button" onClick={onClose} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded-md ml-2">إلغاء</button><button type="submit" className="bg-blue-600 text-white font-bold py-2 px-4 rounded-md">حفظ</button></div>
            </form>
        </Modal>
    );
};

// --- Customers Component ---
const Customers = ({username}) => {
    const [customers, setCustomers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCustomer, setCurrentCustomer] = useState(null);
    const dataPath = `artifacts/${appId}/public/data/userdata/${username}`;

    useEffect(() => {
        if(!username) return;
        const customersCollection = collection(db, `${dataPath}/customers`);
        const unsubscribe = onSnapshot(customersCollection, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCustomers(data);
        });
        return () => unsubscribe();
    }, [username]);
    
    const handleAdd = () => { setCurrentCustomer(null); setIsModalOpen(true); };

    const handleSave = async (customerData) => {
        const customersCollection = collection(db, `${dataPath}/customers`);
        if (currentCustomer && currentCustomer.id) {
            const customerDoc = doc(db, `${dataPath}/customers`, currentCustomer.id);
            await updateDoc(customerDoc, customerData);
        } else {
             await addDoc(customersCollection, {...customerData, joinDate: new Date().toISOString().slice(0, 10) });
        }
        setIsModalOpen(false);
    };
    
    const handleDelete = async (id) => {
       if (window.confirm('هل أنت متأكد من حذف هذا العميل؟')) {
         await deleteDoc(doc(db, `${dataPath}/customers`, id));
       }
    };
    
    return (
       <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">إدارة العملاء</h2>
                <button onClick={handleAdd} className="flex items-center bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-colors"><PlusCircle className="mr-2" size={20}/> إضافة عميل</button>
            </div>
            <div className="overflow-x-auto">
                 <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr><th className="px-4 py-3">الاسم</th><th className="px-4 py-3">البريد الإلكتروني</th><th className="px-4 py-3">الهاتف</th><th className="px-4 py-3">تاريخ الانضمام</th><th className="px-4 py-3 text-left">إجراءات</th></tr>
                    </thead>
                    <tbody>
                        {customers.length > 0 ? ( customers.map(customer => (
                                <tr key={customer.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{customer.name}</td>
                                    <td className="px-4 py-3">{customer.email}</td>
                                    <td className="px-4 py-3">{customer.phone}</td>
                                    <td className="px-4 py-3">{customer.joinDate}</td>
                                    <td className="px-4 py-3 flex items-center space-x-2 justify-end">
                                        <button onClick={() => { setCurrentCustomer(customer); setIsModalOpen(true); }} className="p-2 text-blue-600 hover:text-blue-800"><Edit size={18}/></button>
                                        <button onClick={() => handleDelete(customer.id)} className="p-2 text-red-600 hover:text-red-800"><Trash2 size={18}/></button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                             <tr>
                                <td colSpan="5" className="text-center py-16 text-gray-500 dark:text-gray-400">
                                    <Users size={48} className="mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold">قاعدة بيانات العملاء فارغة</h3>
                                    <p className="mt-2">ابدأ بإضافة عميلك الأول لبناء علاقات قوية.</p>
                                    <button onClick={handleAdd} className="mt-4 flex items-center mx-auto bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-colors"><PlusCircle className="mr-2" size={20}/> إضافة عميل جديد</button>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <CustomerForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} customer={currentCustomer} />
        </div>
    );
};

const CustomerForm = ({ isOpen, onClose, onSave, customer }) => {
    const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
    useEffect(() => { if (customer) setFormData(customer); else setFormData({ name: '', email: '', phone: '' }); }, [customer]);
    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={customer ? "تعديل عميل" : "إضافة عميل"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="الاسم الكامل" className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="البريد الإلكتروني" className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="رقم الهاتف" className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                <div className="flex justify-end pt-4"><button type="button" onClick={onClose} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded-md ml-2">إلغاء</button><button type="submit" className="bg-blue-600 text-white font-bold py-2 px-4 rounded-md">حفظ</button></div>
            </form>
        </Modal>
    );
};


// --- Services Component ---
const Services = ({username}) => {
    const [services, setServices] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentService, setCurrentService] = useState(null);
    const dataPath = `artifacts/${appId}/public/data/userdata/${username}`;

    useEffect(() => {
        if(!username) return;
        const servicesCollection = collection(db, `${dataPath}/services`);
        const unsubscribe = onSnapshot(servicesCollection, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setServices(data);
        });
        return () => unsubscribe();
    }, [username]);
    
    const handleAdd = () => { setCurrentService(null); setIsModalOpen(true); };

    const handleSave = async (serviceData) => {
        const servicesCollection = collection(db, `${dataPath}/services`);
        const data = { ...serviceData, price: Number(serviceData.price) };
        if (currentService && currentService.id) {
            const serviceDoc = doc(db, `${dataPath}/services`, currentService.id);
            await updateDoc(serviceDoc, data);
        } else {
            await addDoc(servicesCollection, data);
        }
        setIsModalOpen(false);
    };

    const handleDelete = async (id) => {
       if (window.confirm('هل أنت متأكد من حذف هذه الخدمة؟')) {
         await deleteDoc(doc(db, `${dataPath}/services`, id));
       }
    };
    
    return (
       <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-gray-800 dark:text-white">إدارة الخدمات</h2><button onClick={handleAdd} className="flex items-center bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-colors"><PlusCircle className="mr-2" size={20}/> إضافة خدمة</button></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {services.length > 0 ? ( services.map(service => (
                        <div key={service.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm overflow-hidden flex flex-col">
                            <div className="p-4 flex-1 flex flex-col">
                                <h3 className="font-bold text-lg text-gray-800 dark:text-white">{service.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex-1">{service.description || 'لا يوجد وصف'}</p>
                                <div className="flex justify-between items-center mt-4"><p className="text-lg font-bold text-blue-600 dark:text-blue-400">ر.س {Number(service.price).toLocaleString()}</p></div>
                            </div>
                             <div className="p-2 bg-gray-100 dark:bg-gray-600 flex justify-end space-x-2 space-x-reverse">
                                 <button onClick={() => { setCurrentService(service); setIsModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-full"><Edit size={18}/></button>
                                 <button onClick={() => handleDelete(service.id)} className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-full"><Trash2 size={18}/></button>
                             </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full text-center py-16 text-gray-500 dark:text-gray-400">
                         <Briefcase size={48} className="mx-auto mb-4" />
                         <h3 className="text-xl font-semibold">لا توجد خدمات معرفة</h3>
                         <p className="mt-2">ابدأ بإضافة خدماتك مثل: تأسيس شركات، إصدار إقامة مميزة،...</p>
                         <button onClick={handleAdd} className="mt-4 flex items-center mx-auto bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-colors"><PlusCircle className="mr-2" size={20}/> إضافة خدمة جديدة</button>
                    </div>
                )}
            </div>
            <ServiceForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} service={currentService} />
        </div>
    );
};


const ServiceForm = ({ isOpen, onClose, onSave, service }) => {
    const [formData, setFormData] = useState({ name: '', description: '', price: ''});
    useEffect(() => { if (service) setFormData(service); else setFormData({ name: '', description: '', price: '' }); }, [service]);
    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={service ? "تعديل خدمة" : "إضافة خدمة"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="اسم الخدمة" className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                <textarea name="description" value={formData.description} onChange={handleChange} placeholder="وصف الخدمة" className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" rows="3"></textarea>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">السعر / التكلفة</label><input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="0.00" className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" required /></div>
                <div className="flex justify-end pt-4"><button type="button" onClick={onClose} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded-md ml-2">إلغاء</button><button type="submit" className="bg-blue-600 text-white font-bold py-2 px-4 rounded-md">حفظ</button></div>
            </form>
        </Modal>
    );
};

// --- Payment Vouchers Component ---
const PaymentVouchers = ({ username }) => {
    const [vouchers, setVouchers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const dataPath = `artifacts/${appId}/public/data/userdata/${username}`;

    useEffect(() => {
        if (!username) return;
        const vouchersCollection = collection(db, `${dataPath}/vouchers`);
        const unsubscribe = onSnapshot(vouchersCollection, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setVouchers(data);
        });
        return () => unsubscribe();
    }, [username]);

    const handleAdd = () => setIsModalOpen(true);

    const handleSave = async (voucherData) => {
        try {
            await runTransaction(db, async (transaction) => {
                const voucherCollection = collection(db, `${dataPath}/vouchers`);
                const newVoucherRef = doc(voucherCollection);
                
                const invoiceRef = doc(db, `${dataPath}/invoices`, voucherData.invoiceId);
                const invoiceSnap = await transaction.get(invoiceRef);
                if (!invoiceSnap.exists()) {
                    throw "Invoice does not exist!";
                }
                
                const invoiceData = invoiceSnap.data();
                const newPaidAmount = (invoiceData.paidAmount || 0) + voucherData.amount;
                const newRemainingAmount = invoiceData.total - newPaidAmount;
                let newStatus = 'مدفوعة جزئياً';
                if (newRemainingAmount <= 0) {
                    newStatus = 'مدفوعة';
                }

                transaction.update(invoiceRef, { 
                    paidAmount: newPaidAmount,
                    remainingAmount: newRemainingAmount,
                    status: newStatus
                });

                const newVoucherNumber = vouchers.length > 0 ? Math.max(...vouchers.map(v => v.voucherNumber)) + 1 : 1;
                transaction.set(newVoucherRef, { ...voucherData, voucherNumber: newVoucherNumber, createdAt: serverTimestamp()});
            });
            console.log("Transaction successfully committed!");
            setIsModalOpen(false);
        } catch (e) {
            console.error("Transaction failed: ", e);
        }
    };
    
    const generateVoucherDocx = (voucher) => {
        if (!window.docx) {
          console.error("Docx library not loaded!");
          alert("مكتبة تصدير الملفات غير جاهزة, يرجى المحاولة مرة أخرى.");
          return;
        }
        const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = window.docx;

        const doc = new Document({
            sections: [{
                properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
                children: [
                    new Paragraph({ text: "الفريق المحترف", alignment: AlignmentType.CENTER, style: "header" }),
                    new Paragraph({ text: "سند قبض", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
                    new Paragraph({ text: `رقم السند: VCH-${voucher.voucherNumber}`, alignment: AlignmentType.RIGHT }),
                    new Paragraph({ text: `التاريخ: ${new Date(voucher.date).toLocaleDateString('ar-SA')}`, alignment: AlignmentType.RIGHT, spacing: { after: 400 } }),
                    new Paragraph({ children: [ new TextRun({ text: "استلمنا من السيد/السادة: ", bold: true }), new TextRun(voucher.customerName) ], alignment: AlignmentType.RIGHT, spacing: { after: 200 } }),
                    new Paragraph({ children: [ new TextRun({ text: "مبلغاً وقدره: ", bold: true }), new TextRun(`${Number(voucher.amount).toLocaleString()} ريال سعودي`) ], alignment: AlignmentType.RIGHT, spacing: { after: 200 } }),
                    new Paragraph({ children: [ new TextRun({ text: "وذلك عن: ", bold: true }), new TextRun(`دفعة من فاتورة رقم INV-${voucher.invoiceNumber}`) ], alignment: AlignmentType.RIGHT, spacing: { after: 800 } }),
                    new Paragraph({ children: [ new TextRun({ text: "المستلم: .........................", bold: true })], alignment: AlignmentType.LEFT }),
                ],
            }],
        });

        Packer.toBlob(doc).then(blob => {
            window.saveAs(blob, `سند-قبض-${voucher.voucherNumber}.docx`);
        });
    };

    return (
       <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-gray-800 dark:text-white">إدارة سندات القبض</h2><button onClick={handleAdd} className="flex items-center bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-colors"><PlusCircle className="mr-2" size={20}/> سند قبض جديد</button></div>
            <div className="overflow-x-auto">
                 <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr><th className="px-4 py-3">#</th><th className="px-4 py-3">العميل</th><th className="px-4 py-3">فاتورة #</th><th className="px-4 py-3">المبلغ</th><th className="px-4 py-3">التاريخ</th><th className="px-4 py-3 text-left">إجراءات</th></tr>
                    </thead>
                    <tbody>
                        {vouchers.length > 0 ? ( vouchers.map(voucher => (
                                <tr key={voucher.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">VCH-{voucher.voucherNumber}</td>
                                    <td className="px-4 py-3">{voucher.customerName}</td>
                                    <td className="px-4 py-3">INV-{voucher.invoiceNumber}</td>
                                    <td className="px-4 py-3">ر.س {Number(voucher.amount).toLocaleString()}</td>
                                    <td className="px-4 py-3">{voucher.date}</td>
                                    <td className="px-4 py-3 flex items-center space-x-2 justify-end">
                                        <button onClick={() => generateVoucherDocx(voucher)} className="p-2 text-green-600 hover:text-green-800"><Download size={18}/></button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                             <tr>
                                <td colSpan="6" className="text-center py-16 text-gray-500 dark:text-gray-400">
                                    <ClipboardCheck size={48} className="mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold">لا توجد سندات قبض بعد</h3>
                                    <p className="mt-2">ابدأ بإضافة سند جديد لتسجيل الدفعات.</p>
                                    <button onClick={handleAdd} className="mt-4 flex items-center mx-auto bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-colors"><PlusCircle className="mr-2" size={20}/> إضافة سند جديد</button>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <PaymentVoucherForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} username={username} />
        </div>
    );
};

const PaymentVoucherForm = ({ isOpen, onClose, onSave, username }) => {
    const [formData, setFormData] = useState({ customerId: '', invoiceId: '', amount: '', date: new Date().toISOString().slice(0, 10), customerName: '', invoiceNumber: '' });
    const [customers, setCustomers] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const dataPath = `artifacts/${appId}/public/data/userdata/${username}`;

    useEffect(() => {
        if (!isOpen) return;
        const customersCollection = collection(db, `${dataPath}/customers`);
        getDocs(customersCollection).then(snapshot => {
            setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
    }, [isOpen, username]);
    
    useEffect(() => {
        if (formData.customerId) {
            const invoicesQuery = query(collection(db, `${dataPath}/invoices`), where("customerId", "==", formData.customerId), where("status", "in", ["قيد الانتظار", "مدفوعة جزئياً"]));
            getDocs(invoicesQuery).then(snapshot => {
                setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
        } else {
            setInvoices([]);
        }
    }, [formData.customerId]);
    
    const handleCustomerChange = (e) => {
        const customerId = e.target.value;
        const customerName = customers.find(c => c.id === customerId)?.name || '';
        setFormData({ ...formData, customerId, customerName, invoiceId: '', amount: '' });
    };
    
    const handleInvoiceChange = (e) => {
        const invoiceId = e.target.value;
        const selectedInvoice = invoices.find(inv => inv.id === invoiceId);
        if (selectedInvoice) {
            const remaining = (selectedInvoice.total || 0) - (selectedInvoice.paidAmount || 0);
            setFormData({ ...formData, invoiceId, amount: remaining, invoiceNumber: selectedInvoice.invoiceNumber });
        }
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSubmit = (e) => { e.preventDefault(); onSave({...formData, amount: Number(formData.amount)}); };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="إضافة سند قبض جديد">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العميل</label>
                    <select name="customerId" value={formData.customerId} onChange={handleCustomerChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" required>
                        <option value="">اختر عميلاً</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                {formData.customerId && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الفاتورة المستحقة</label>
                    <select name="invoiceId" value={formData.invoiceId} onChange={handleInvoiceChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" required>
                        <option value="">اختر فاتورة</option>
                        {invoices.map(inv => <option key={inv.id} value={inv.id}>INV-{inv.invoiceNumber} (المتبقي: {(inv.total - (inv.paidAmount || 0)).toLocaleString()})</option>)}
                    </select>
                </div>
                )}
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المبلغ المدفوع</label><input type="number" name="amount" value={formData.amount} onChange={handleChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تاريخ الدفع</label><input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" required /></div>
                <div className="flex justify-end pt-4"><button type="button" onClick={onClose} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded-md ml-2">إلغاء</button><button type="submit" className="bg-blue-600 text-white font-bold py-2 px-4 rounded-md">حفظ السند</button></div>
            </form>
        </Modal>
    );
};
