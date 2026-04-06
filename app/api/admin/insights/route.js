import { requireAdmin, getServiceClient } from '../../../../lib/admin';

export async function GET(req) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return Response.json({ error: 'Acesso negado' }, { status: 403 });

    const supabase = getServiceClient();
    if (!supabase) return Response.json({ error: 'Service key não configurada' }, { status: 500 });

    const url = new URL(req.url);
    const days = Math.min(parseInt(url.searchParams.get('days') || '30', 10), 90);
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Buscar mensagens dos usuários (role='user') dos últimos N dias
    const { data: messages, error } = await supabase
      .from('messages')
      .select('content, chat_id, created_at')
      .eq('role', 'user')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(3000);

    if (error) throw error;

    const msgs = messages || [];

    // Extrair tópicos/palavras-chave das mensagens dos usuários
    const stopWords = new Set([
      'de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'em', 'no', 'na', 'nos', 'nas',
      'um', 'uma', 'uns', 'umas', 'que', 'para', 'com', 'por', 'se', 'não', 'mais', 'muito',
      'como', 'me', 'meu', 'minha', 'meus', 'minhas', 'eu', 'você', 'ele', 'ela', 'nós',
      'eles', 'elas', 'esse', 'essa', 'este', 'esta', 'isso', 'isto', 'aqui', 'ali', 'lá',
      'tem', 'ter', 'ser', 'estar', 'foi', 'são', 'está', 'é', 'ou', 'mas', 'porém',
      'sobre', 'entre', 'até', 'também', 'já', 'ainda', 'quando', 'qual', 'quais',
      'pode', 'posso', 'quero', 'preciso', 'fazer', 'favor', 'olá', 'oi', 'obrigada',
      'obrigado', 'bom', 'boa', 'dia', 'tarde', 'noite', 'sim', 'ok', 'certo',
      'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'shall', 'can', 'need', 'must', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
      'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their',
      'this', 'that', 'these', 'those', 'a', 'an', 'the', 'and', 'but', 'or',
      'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'so', 'if', 'then',
      'than', 'too', 'very', 'just', 'only', 'also', 'how', 'what', 'which', 'who',
      'when', 'where', 'why', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
      'other', 'some', 'such', 'no', 'nor', 'not', 'own', 'same', 'so', 'than',
      'pra', 'pro', 'num', 'numa', 'pelo', 'pela', 'pelos', 'pelas', 'suas', 'seus',
      'dele', 'dela', 'deles', 'delas', 'tudo', 'nada', 'algo', 'alguém', 'ninguém',
      'cada', 'outro', 'outra', 'outros', 'outras', 'mesmo', 'mesma', 'mesmos', 'mesmas',
      'queria', 'gostaria', 'poderia', 'ajuda', 'ajude', 'por favor', 'tipo',
    ]);

    // Contar palavras relevantes (2+ chars, não stopword)
    const wordCounts = {};
    const bigramCounts = {};

    for (const msg of msgs) {
      const text = msg.content
        .toLowerCase()
        .replace(/[^a-záàâãéèêíïóôõöúüçñ\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const words = text.split(' ').filter(w => w.length >= 3 && !stopWords.has(w));

      // Uni-grams
      const seen = new Set();
      for (const w of words) {
        if (!seen.has(w)) {
          wordCounts[w] = (wordCounts[w] || 0) + 1;
          seen.add(w);
        }
      }

      // Bi-grams (pares de palavras)
      for (let i = 0; i < words.length - 1; i++) {
        const bigram = `${words[i]} ${words[i + 1]}`;
        if (!seen.has(bigram)) {
          bigramCounts[bigram] = (bigramCounts[bigram] || 0) + 1;
          seen.add(bigram);
        }
      }
    }

    // Top palavras (mín 2 ocorrências)
    const topKeywords = Object.entries(wordCounts)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([word, count]) => ({ word, count }));

    // Top bi-grams (mín 2 ocorrências)
    const topPhrases = Object.entries(bigramCounts)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([phrase, count]) => ({ phrase, count }));

    // Atividade por hora (distribuição)
    const hourlyActivity = Array(24).fill(0);
    for (const msg of msgs) {
      const hour = new Date(msg.created_at).getHours();
      hourlyActivity[hour]++;
    }

    // Atividade por dia da semana
    const weekdayActivity = Array(7).fill(0);
    const weekdayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    for (const msg of msgs) {
      const day = new Date(msg.created_at).getDay();
      weekdayActivity[day]++;
    }

    // Volume diário de mensagens
    const dailyMap = {};
    for (const msg of msgs) {
      const day = msg.created_at.slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = 0;
      dailyMap[day]++;
    }
    const dailyMessages = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Sessões únicas (chats distintos)
    const uniqueChats = new Set(msgs.map(m => m.chat_id)).size;

    // Mensagens recentes (últimas 20 perguntas)
    const recentQuestions = msgs.slice(0, 20).map(m => ({
      content: m.content.slice(0, 200),
      date: m.created_at,
    }));

    // Comprimento médio das mensagens
    const avgLength = msgs.length > 0
      ? Math.round(msgs.reduce((sum, m) => sum + m.content.length, 0) / msgs.length)
      : 0;

    return Response.json({
      period: { days, since: since.toISOString() },
      summary: {
        totalMessages: msgs.length,
        uniqueChats,
        avgMessageLength: avgLength,
      },
      topKeywords,
      topPhrases,
      hourlyActivity: hourlyActivity.map((count, hour) => ({
        hour: `${hour.toString().padStart(2, '0')}h`,
        count,
      })),
      weekdayActivity: weekdayActivity.map((count, i) => ({
        day: weekdayLabels[i],
        count,
      })),
      dailyMessages,
      recentQuestions,
    });
  } catch (err) {
    console.error('[ADMIN/INSIGHTS] Error:', err.message);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}
