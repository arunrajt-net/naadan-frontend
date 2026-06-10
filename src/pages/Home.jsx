import React, { useRef } from 'react';
import { ArrowRight, Code, Cpu, Handshake, Leaf, Map, MapPin, Mic, Search, ShieldCheck, Sprout, Star, TrendingUp, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'motion/react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
};

const floatAnimation = (delay = 0) => ({
  y: [0, -12, 0],
  transition: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay }
});

const Home = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Dynamic hero CTA values
  let secondaryBtnText = "Register / Sign In";
  let secondaryBtnPath = "/auth";
  let SecondaryIcon = Handshake;

  if (token) {
    if (user.role === 'farmer') {
      secondaryBtnText = "Farmer Dashboard";
      secondaryBtnPath = "/farmer/dashboard";
      SecondaryIcon = Sprout;
    } else if (user.role === 'buyer') {
      secondaryBtnText = "My Orders";
      secondaryBtnPath = "/buyer/orders";
      SecondaryIcon = Package;
    } else if (user.role === 'admin') {
      secondaryBtnText = "Admin Dashboard";
      secondaryBtnPath = "/admin";
      SecondaryIcon = ShieldCheck;
    }
  }
  const { scrollYProgress } = useScroll();
  const yBg = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const opacityHero = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <div className="font-sans text-gray-900 bg-[#FAFAFA] overflow-hidden">
      {/* Background Orbs */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-green-200/40 blur-[100px] pointer-events-none -z-10" />
      <div className="fixed top-[20%] right-[-5%] w-[400px] h-[400px] rounded-full bg-orange-200/30 blur-[120px] pointer-events-none -z-10" />

      {/* Hero Section */}
      <motion.section 
        style={{ opacity: opacityHero }}
        className="relative pt-24 pb-20 sm:pt-32 sm:pb-28 flex flex-col items-center justify-center min-h-[90vh]"
      >
        <motion.div 
          className="mx-auto max-w-7xl px-6 lg:px-8 text-center relative z-10"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="flex justify-center mb-6">
            <motion.div 
              animate={floatAnimation(0)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/95 backdrop-blur-md text-green-700 font-bold text-sm shadow-md ring-1 ring-green-500/10"
            >
              <Leaf className="h-5 w-5 text-green-500" /> Connecting Local Farm Ecosystems
            </motion.div>
          </motion.div>
          
          <motion.h1 variants={itemVariants} className="text-6xl font-black tracking-tighter text-gray-900 sm:text-7xl lg:text-[5.5rem] mb-6 leading-[1.1]">
            From Our Land <br className="hidden sm:block" /> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-400 drop-shadow-sm">
              to Your Hands
            </span>
          </motion.h1>
          
          <motion.p variants={itemVariants} className="mx-auto mt-4 max-w-2xl text-xl leading-relaxed text-gray-600 mb-10 font-medium">
            Connect directly with verified local farmers, track real-time market trends, and get AI-powered crop guidance. A simple, direct local commerce platform.
          </motion.p>

          {/* Premium Visual Pills */}
          <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-3 mb-12 max-w-lg mx-auto">
            <span className="px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-semibold border border-green-200/50 flex items-center gap-1.5 shadow-sm">
              🌱 Fresh Crops
            </span>
            <span className="px-4 py-2 bg-orange-50 text-orange-700 rounded-full text-sm font-semibold border border-orange-200/50 flex items-center gap-1.5 shadow-sm">
              📈 Market Insights
            </span>
            <span className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold border border-blue-200/50 flex items-center gap-1.5 shadow-sm">
              🤖 AI Recommendations
            </span>
            <span className="px-4 py-2 bg-purple-50 text-purple-700 rounded-full text-sm font-semibold border border-purple-200/50 flex items-center gap-1.5 shadow-sm">
              🛡️ Verified Farmers
            </span>
          </motion.div>
          
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <motion.button 
              whileHover={{ scale: 1.03, boxShadow: '0 20px 25px -5px rgba(34, 197, 94, 0.3)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/buyer/search')}
              className="group relative flex items-center justify-center gap-3 w-full sm:w-auto text-lg font-bold py-4.5 px-9 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-2xl shadow-lg overflow-hidden cursor-pointer border-none"
            >
              <MapPin size={22} /> Explore Nearby Shop
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>
            
            <motion.button 
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(secondaryBtnPath)}
              className="group flex items-center justify-center gap-3 w-full sm:w-auto text-lg font-bold py-4.5 px-9 bg-white text-gray-800 rounded-2xl shadow-md border border-gray-200 hover:border-green-200 transition-colors cursor-pointer"
            >
              <SecondaryIcon size={22} className="text-orange-500 group-hover:rotate-12 transition-transform" /> {secondaryBtnText}
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Floating background elements for Hero */}
        <motion.div animate={floatAnimation(0.5)} className="absolute left-[8%] top-[25%] opacity-20 hidden lg:block -z-10">
           <Sprout size={110} className="text-green-500" />
        </motion.div>
        <motion.div animate={{ y: [0, 15, 0], rotate: [0, 8, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} className="absolute right-[10%] top-[45%] opacity-10 hidden lg:block -z-10">
           <Leaf size={130} className="text-emerald-600" />
        </motion.div>
      </motion.section>

      {/* Values Section */}
      <section className="py-28 bg-white relative">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="text-sm font-black leading-8 text-green-600 tracking-[0.2em] uppercase mb-4">Core Values</h2>
            <p className="mt-2 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">Why choose Naadan?</p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: 'Direct Farmer Connection', desc: 'Buy produce harvested directly from local fields. Simple, fresh, and supportive of local farmers.', icon: Sprout, color: 'text-green-500', bg: 'bg-green-50' },
              { title: 'Market Trend Guidance', desc: 'Compare live market prices and local trends to make informed decisions and find fair rates.', icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-50' },
              { title: 'Hyperlocal Discovery', desc: 'Locate certified agricultural products and active farms within your neighborhood on a smart interactive map.', icon: Map, color: 'text-blue-500', bg: 'bg-blue-50' },
            ].map((feature, i) => (
              <motion.div 
                key={feature.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.7, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -10, scale: 1.01 }}
                className="group relative bg-white p-8 rounded-[2rem] shadow-md hover:shadow-lg border border-gray-100 overflow-hidden transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className={`relative w-16 h-16 flex items-center justify-center rounded-2xl mb-6 ${feature.bg} group-hover:scale-105 transition-transform duration-300`}>
                  <feature.icon className={`h-8 w-8 ${feature.color}`} />
                </div>
                <h3 className="relative text-2xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                <p className="relative text-md text-gray-600 leading-relaxed font-semibold">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Section */}
      <section className="py-28 bg-[#0A0F0D] relative overflow-hidden">
        <motion.div style={{ y: yBg }} className="absolute inset-0 opacity-20">
           <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-900/40 via-transparent to-transparent" />
        </motion.div>
        
        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
           <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             whileInView={{ opacity: 1, scale: 1 }}
             viewport={{ once: true }}
             className="text-center mb-20"
           >
            <h2 className="text-sm font-black leading-8 text-emerald-400 tracking-[0.2em] uppercase mb-4">Technology Stack</h2>
            <p className="mt-2 text-4xl font-extrabold tracking-tight text-white flex items-center justify-center gap-3">
              <Cpu className="h-10 w-10 text-emerald-400 animate-pulse" /> Intelligent Platform Engine
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             {[
               { title: 'React Frontend', desc: 'Smooth user interface transitions and fast rendering powered by Vite.', icon: Code, delay: 0.05 },
               { title: 'Python Backend', desc: 'Secure Flask API processing orders and coordinating databases.', icon: Cpu, delay: 0.1 },
               { title: 'Geospatial Maps', desc: 'Interactive Leaflet mapping matching buyers with nearby growers.', icon: Map, delay: 0.15 },
               { title: 'Gemini AI Assistant', desc: 'Natural language crop voice input for hands-free farmer support.', icon: Mic, delay: 0.2 },
             ].map((tech) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  whileInView={{ opacity: 1, y: 0 }} 
                  transition={{ duration: 0.5, delay: tech.delay }} 
                  viewport={{ once: true }} 
                  whileHover={{ scale: 1.03, borderColor: 'rgba(52, 211, 153, 0.4)' }}
                  key={tech.title} 
                  className="bg-gray-800/30 backdrop-blur-md p-6 rounded-2xl border border-gray-700/40 hover:shadow-[0_0_20px_rgba(52,211,153,0.1)] transition-all flex flex-col items-center text-center group"
                >
                   <div className="p-3 bg-gray-900 rounded-xl mb-4 group-hover:bg-emerald-500/10 transition-colors">
                     <tech.icon className="h-8 w-8 text-emerald-400" />
                   </div>
                   <h3 className="text-lg font-bold text-gray-100 mb-2">{tech.title}</h3>
                   <p className="text-gray-400 text-xs leading-relaxed font-semibold">{tech.desc}</p>
                </motion.div>
             ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-28 bg-gray-50 relative">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div 
             initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.8 }}
             className="text-center mb-20"
          >
            <h2 className="text-sm font-black leading-8 text-orange-600 tracking-[0.2em] uppercase mb-4">Real-World Applications</h2>
            <p className="mt-2 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">Built for the Community</p>
          </motion.div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             {[
               { icon: Leaf, color: 'text-green-500', bd: 'border-green-500', title: 'For Farmers', text: 'Instantly add items with voice commands, review local market recommendations, and build a verified profile with community trust.' },
               { icon: Search, color: 'text-orange-500', bd: 'border-orange-500', title: 'For Buyers', text: 'Browse fresh local crops on an interactive map. Buy from verified farmers, get delivery options, and rate your experience.' },
               { icon: ShieldCheck, color: 'text-blue-500', bd: 'border-blue-500', title: 'Local Economy', text: 'Support regional food networks, promote eco-friendly short supply chains, and build local trust with direct payments.' }
             ].map((block, i) => (
                <motion.div 
                   key={block.title}
                   initial={{ opacity: 0, x: -20 }} 
                   whileInView={{ opacity: 1, x: 0 }} 
                   transition={{ duration: 0.5, delay: i * 0.15 }}
                   viewport={{ once: true }}
                   whileHover={{ y: -8 }}
                   className={`bg-white rounded-[2rem] border-t-[6px] ${block.bd} p-8 shadow-sm hover:shadow-md transition-all`}
                >
                  <div className={`w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center mb-6`}>
                    <block.icon className={`${block.color} h-7 w-7`} />
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-4">{block.title}</h4>
                  <p className="text-md text-gray-600 leading-relaxed font-semibold">{block.text}</p>
                </motion.div>
             ))}
          </div>
        </div>
      </section>
      
      {/* Footer CTA */}
      <section className="py-20 bg-white relative overflow-hidden">
         <div className="mx-auto max-w-4xl px-6 text-center">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }}>
              <h2 className="text-3xl font-black text-gray-900 mb-6">Ready to harvest the benefits?</h2>
              <button 
                onClick={() => navigate('/auth')}
                className="btn btn-primary text-lg py-4 px-12 shadow-xl hover:scale-102 transition-transform cursor-pointer border-none"
              >
                Get Started Today
              </button>
            </motion.div>
         </div>
      </section>
    </div>
  );
};

export default Home;
