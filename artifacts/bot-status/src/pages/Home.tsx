import React, { useEffect, useState } from 'react';
import { 
  Terminal, Coins, Pickaxe, Fish, Sprout, Dices, 
  Landmark, Swords, Trophy, Activity, ChevronRight, Hash 
} from 'lucide-react';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const features = [
    {
      icon: <Coins className="w-6 h-6 text-primary" />,
      title: "Kiếm tiền",
      desc: "Làm việc chăm chỉ hoặc thử vận may để lấp đầy túi tiền của bạn.",
      color: "border-primary/50 group-hover:border-primary"
    },
    {
      icon: <Pickaxe className="w-6 h-6 text-orange-400" />,
      title: "Đào quặng",
      desc: "Khám phá các mỏ quặng sâu thẳm, thu thập tài nguyên quý giá.",
      color: "border-orange-400/50 group-hover:border-orange-400"
    },
    {
      icon: <Fish className="w-6 h-6 text-blue-400" />,
      title: "Câu cá",
      desc: "Thư giãn bên hồ nước, bắt những chú cá hiếm và giá trị.",
      color: "border-blue-400/50 group-hover:border-blue-400"
    },
    {
      icon: <Sprout className="w-6 h-6 text-accent" />,
      title: "Trồng cây",
      desc: "Chăm sóc khu vườn của riêng bạn và thu hoạch nông sản.",
      color: "border-accent/50 group-hover:border-accent"
    },
    {
      icon: <Dices className="w-6 h-6 text-secondary" />,
      title: "Tài xỉu",
      desc: "Thử thách nhân phẩm, làm giàu nhanh chóng với trò chơi may rủi.",
      color: "border-secondary/50 group-hover:border-secondary"
    },
    {
      icon: <Landmark className="w-6 h-6 text-yellow-400" />,
      title: "Ngân hàng",
      desc: "Gửi tiền an toàn, nhận lãi suất mỗi ngày và tránh rủi ro mất mát.",
      color: "border-yellow-400/50 group-hover:border-yellow-400"
    },
    {
      icon: <Swords className="w-6 h-6 text-red-500" />,
      title: "Đấu trường",
      desc: "Giao lưu võ thuật, so tài cùng người chơi khác.",
      color: "border-red-500/50 group-hover:border-red-500"
    },
    {
      icon: <Trophy className="w-6 h-6 text-yellow-300" />,
      title: "Bảng xếp hạng",
      desc: "Ghi tên mình lên đỉnh cao danh vọng của máy chủ.",
      color: "border-yellow-300/50 group-hover:border-yellow-300"
    }
  ];

  const commands = [
    { cmd: "!daily", desc: "Nhận phần thưởng điểm danh mỗi ngày." },
    { cmd: "!mine", desc: "Bắt đầu chuyến đi đào quặng." },
    { cmd: "!fish", desc: "Thả cần câu và chờ đợi vận may." },
    { cmd: "!garden", desc: "Quản lý khu vườn của bạn." },
    { cmd: "!taixiu <số tiền> <tài/xỉu>", desc: "Cược tiền vào tài hoặc xỉu." },
  ];

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground overflow-x-hidden selection:bg-primary/30 selection:text-primary">
      {/* Abstract Background Noise / Grid */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0" 
           style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background z-0" />

      {/* Hero Section */}
      <section className="relative z-10 min-h-[60vh] flex flex-col items-center justify-center px-6 py-20">
        <div className={`transition-all duration-1000 ease-out flex flex-col items-center text-center ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 backdrop-blur-sm mb-8">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
            </span>
            <span className="text-sm font-mono text-primary font-medium tracking-wide">ONLINE</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-4 text-glow flex items-center gap-4">
            HiHiHi
            <Hash className="w-10 h-10 md:w-16 md:h-16 text-primary/50" />
            <span className="text-4xl md:text-6xl text-primary/80">9062</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl font-light leading-relaxed mt-4">
            Bot RPG kinh tế bằng tiếng Việt. Sống sót, cày cuốc và làm giàu ngay trong máy chủ Discord của bạn.
          </p>

          <div className="mt-10 flex items-center gap-6">
            <a href="#commands" className="px-8 py-4 bg-primary text-primary-foreground font-bold rounded-md hover:bg-primary/90 transition-colors box-glow uppercase tracking-wider text-sm flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Xem Lệnh
            </a>
            <a href="#features" className="px-8 py-4 border border-border text-foreground hover:bg-card hover:border-primary/50 transition-colors rounded-md uppercase tracking-wider text-sm font-medium">
              Tính Năng
            </a>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative z-10 py-24 px-6 bg-card/30 border-y border-border backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-12">
            <Activity className="w-8 h-8 text-secondary" />
            <h2 className="text-3xl md:text-4xl font-bold text-glow-secondary">Hệ Sinh Thái</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feat, idx) => (
              <div 
                key={idx} 
                className={`group p-6 rounded-xl bg-background border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/5 ${feat.color}`}
              >
                <div className="w-12 h-12 rounded-lg bg-card flex items-center justify-center mb-4 border border-border group-hover:scale-110 transition-transform">
                  {feat.icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{feat.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to Use / Terminal */}
      <section id="commands" className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-12 justify-center">
            <Terminal className="w-8 h-8 text-accent" />
            <h2 className="text-3xl md:text-4xl font-bold text-glow-accent">Cách Dùng</h2>
          </div>

          <div className="rounded-xl overflow-hidden border border-border bg-[#0a0a0c] shadow-2xl shadow-accent/5">
            {/* Terminal Header */}
            <div className="flex items-center px-4 py-3 bg-card border-b border-border gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-accent" />
              <div className="ml-4 text-xs font-mono text-muted-foreground">hihihi-bash — 80x24</div>
            </div>
            
            {/* Terminal Body */}
            <div className="p-6 font-mono text-sm md:text-base space-y-6">
              <div>
                <p className="text-muted-foreground mb-2"># Prefix mặc định của bot là dấu chấm than</p>
                <div className="flex items-center gap-2 text-primary">
                  <ChevronRight className="w-4 h-4" />
                  <span>Prefix: <span className="font-bold text-white bg-primary/20 px-2 py-0.5 rounded">!</span></span>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-muted-foreground"># Một số lệnh cơ bản để bắt đầu:</p>
                {commands.map((cmd, idx) => (
                  <div key={idx} className="group flex flex-col md:flex-row md:items-center gap-2 md:gap-4 p-2 -mx-2 rounded hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-2 text-accent whitespace-nowrap">
                      <ChevronRight className="w-4 h-4 opacity-50" />
                      <span className="font-semibold">{cmd.cmd}</span>
                    </div>
                    <span className="text-muted-foreground hidden md:inline">→</span>
                    <span className="text-gray-300 md:ml-auto">{cmd.desc}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-white/5 animate-pulse text-muted-foreground flex items-center gap-2">
                <span className="w-2 h-4 bg-primary inline-block"></span>
                Đang chờ lệnh...
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border bg-card/50 backdrop-blur-md py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="font-bold text-lg">HiHiHi</span>
          <span className="text-primary font-mono bg-primary/10 px-2 py-0.5 rounded text-sm border border-primary/20">#9062</span>
        </div>
        <p className="text-muted-foreground text-sm">
          Sống sót và làm giàu trong thế giới Discord.
        </p>
      </footer>
    </div>
  );
}
