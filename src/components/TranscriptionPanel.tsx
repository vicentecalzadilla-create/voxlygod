import { useState, useEffect, useRef } from 'react';
import { FileText, Copy, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface TranscriptionSegment {
  time: number;
  text: string;
  isVerse?: boolean;
  verseRef?: string;
}

interface TranscriptionPanelProps {
  audioId: string;
  currentTime: number;
  isPlaying: boolean;
}

// Mock transcriptions synced to audio content
const TRANSCRIPTIONS: Record<string, TranscriptionSegment[]> = {
  '1': [
    { time: 0, text: 'El Señor es mi pastor, nada me faltará.', isVerse: true, verseRef: 'Salmo 23:1' },
    { time: 8, text: 'En lugares de delicados pastos me hará descansar.' },
    { time: 15, text: 'Junto a aguas de reposo me pastoreará.', isVerse: true, verseRef: 'Salmo 23:2' },
    { time: 22, text: 'Confortará mi alma.' },
    { time: 28, text: 'Me guiará por sendas de justicia por amor de su nombre.', isVerse: true, verseRef: 'Salmo 23:3' },
    { time: 38, text: 'Aunque ande en valle de sombra de muerte,' },
    { time: 45, text: 'no temeré mal alguno, porque tú estarás conmigo.', isVerse: true, verseRef: 'Salmo 23:4' },
    { time: 55, text: 'Tu vara y tu cayado me infundirán aliento.' },
    { time: 65, text: 'Aderezas mesa delante de mí en presencia de mis angustiadores.', isVerse: true, verseRef: 'Salmo 23:5' },
    { time: 78, text: 'Unges mi cabeza con aceite; mi copa está rebosando.' },
    { time: 88, text: 'Ciertamente el bien y la misericordia me seguirán todos los días de mi vida.', isVerse: true, verseRef: 'Salmo 23:6' },
    { time: 100, text: 'Y en la casa del Señor moraré por largos días.' },
  ],
  '2': [
    { time: 0, text: 'Señor, te damos gracias por este nuevo día.' },
    { time: 8, text: 'Gracias por la vida, por la salud, por cada bendición.' },
    { time: 18, text: 'Tu misericordia es nueva cada mañana.', isVerse: true, verseRef: 'Lamentaciones 3:23' },
    { time: 28, text: 'Grande es tu fidelidad, Señor.' },
    { time: 35, text: 'Te pedimos que guíes nuestros pasos hoy.' },
    { time: 45, text: 'Que tu voluntad sea hecha en nuestras vidas.' },
  ],
  '3': [
    { time: 0, text: 'Jesús dijo a sus discípulos:' },
    { time: 6, text: 'Si tuvierais fe como un grano de mostaza,', isVerse: true, verseRef: 'Mateo 17:20' },
    { time: 14, text: 'diríais a este monte: Pásate de aquí allá, y se pasaría.' },
    { time: 24, text: 'Y nada os sería imposible.' },
    { time: 32, text: 'La fe no depende del tamaño, sino de en quién la depositas.' },
    { time: 42, text: 'Dios puede mover montañas en tu vida.' },
  ],
  '4': [
    { time: 0, text: 'Mi nombre es Ana, y quiero compartir lo que Dios hizo en mi vida.' },
    { time: 10, text: 'Estuve en un lugar muy oscuro, sin esperanza.' },
    { time: 20, text: 'Pero Dios me encontró en mi momento más difícil.' },
    { time: 30, text: 'Porque yo sé los planes que tengo para ustedes.', isVerse: true, verseRef: 'Jeremías 29:11' },
    { time: 40, text: 'Planes de bienestar y no de calamidad.' },
  ],
  '5': [
    { time: 0, text: 'Al final del día, descansa en las promesas de Dios.' },
    { time: 10, text: 'Venid a mí todos los que estáis trabajados y cargados,', isVerse: true, verseRef: 'Mateo 11:28' },
    { time: 20, text: 'y yo os haré descansar.' },
    { time: 28, text: 'Suelta tus preocupaciones. Él cuida de ti.' },
    { time: 38, text: 'Echando toda vuestra ansiedad sobre él,', isVerse: true, verseRef: '1 Pedro 5:7' },
    { time: 46, text: 'porque él tiene cuidado de vosotros.' },
  ],
};

const TranscriptionPanel = ({ audioId, currentTime, isPlaying }: TranscriptionPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedVerse, setCopiedVerse] = useState<string | null>(null);
  const { theme } = useTheme();
  const activeRef = useRef<HTMLDivElement>(null);

  const segments = TRANSCRIPTIONS[audioId] || [];
  
  // Find current segment
  const currentSegmentIndex = segments.reduce((acc, seg, i) => {
    if (seg.time <= currentTime) return i;
    return acc;
  }, 0);

  useEffect(() => {
    if (activeRef.current && isExpanded) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentSegmentIndex, isExpanded]);

  const copyVerse = (text: string, ref?: string) => {
    const copyText = ref ? `"${text}" — ${ref}` : text;
    navigator.clipboard.writeText(copyText);
    setCopiedVerse(ref || text);
    setTimeout(() => setCopiedVerse(null), 2000);
  };

  if (segments.length === 0) return null;

  const currentSegment = segments[currentSegmentIndex];

  return (
    <div className="w-full">
      {/* Compact view - current line */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl card-luminous text-left"
      >
        <FileText className="w-3.5 h-3.5 text-accent shrink-0" />
        <p className={`text-[11px] flex-1 truncate ${currentSegment?.isVerse ? 'gold-text font-semibold' : 'text-foreground/80'}`}>
          {currentSegment?.text || 'Transcripción...'}
        </p>
        {currentSegment?.verseRef && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 gold-text shrink-0">{currentSegment.verseRef}</span>
        )}
        {isExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" /> : <ChevronUp className="w-3 h-3 text-muted-foreground shrink-0" />}
      </button>

      {/* Expanded transcription */}
      {isExpanded && (
        <div
          className="mt-2 max-h-40 overflow-y-auto rounded-xl p-3 space-y-1.5"
          style={{
            background: theme === 'dark' ? 'hsl(222 47% 10% / 0.9)' : 'hsl(0 0% 100% / 0.85)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {segments.map((seg, i) => {
            const isActive = i === currentSegmentIndex;
            const isPast = i < currentSegmentIndex;
            return (
              <div
                key={i}
                ref={isActive ? activeRef : undefined}
                className={`flex items-start gap-2 px-2 py-1.5 rounded-lg transition-all ${
                  isActive ? 'bg-primary/10' : ''
                }`}
              >
                <span className="text-[9px] text-muted-foreground w-6 shrink-0 pt-0.5">
                  {Math.floor(seg.time / 60)}:{(seg.time % 60).toString().padStart(2, '0')}
                </span>
                <p className={`text-[11px] flex-1 leading-relaxed transition-opacity ${
                  isActive 
                    ? seg.isVerse ? 'gold-text font-bold' : 'text-foreground font-medium' 
                    : isPast ? 'text-muted-foreground' : 'text-foreground/60'
                }`}>
                  {seg.text}
                </p>
                {seg.isVerse && (
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/15 gold-text">{seg.verseRef}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); copyVerse(seg.text, seg.verseRef); }}
                      className="p-1 rounded-md hover:bg-secondary/60"
                    >
                      {copiedVerse === seg.verseRef ? (
                        <span className="text-[8px] text-accent">✓</span>
                      ) : (
                        <Copy className="w-3 h-3 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TranscriptionPanel;
