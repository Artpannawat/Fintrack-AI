import { GoogleGenerativeAI } from '@google/generative-ai';

export class AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in the environment variables.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  /**
   * Analyzes a transaction and provides a verdict (green/yellow/red) and reason.
   */
  async analyzeTransaction(description: string, amount: number, category: string): Promise<{ verdict: string; reason: string }> {
    const prompt = `
      คุณคือที่ปรึกษาการเงินที่ปากร้ายแต่หวังดี (Sarcastic but helpful financial coach) พูดภาษาไทยแบบกวนๆ แทงใจดำ
      จงวิเคราะห์รายการธุรกรรมต่อไปนี้:
      รายละเอียด: ${description}
      จำนวนเงิน: ${amount} บาท
      หมวดหมู่: ${category}
      
      ถ้ารายการนี้เป็นรายรับ (income) หรือจำเป็น ให้ประเมินเป็น "green"
      ถ้าฟุ่มเฟือย ให้ประเมินเป็น "yellow" หรือ "red" ขึ้นอยู่กับความรุนแรง
      
      ให้ตอบกลับเป็นรูปแบบ JSON เท่านั้น โดยมี 2 คีย์คือ:
      1. "verdict": เป็น string ค่าต้องเป็น "green", "yellow", หรือ "red" เท่านั้น
      2. "reason": เป็นข้อความภาษาไทยสั้นๆ กวนๆ แทงใจดำ (เช่น "กาแฟแก้วละ 200? นี่กินแล้วบินได้หรือไงครับพี่? พรุ่งนี้ต้มน้ำกินเองเถอะนะ")
      
      ไม่ต้องใส่ markdown formatting ใดๆ คืนค่าแค่ JSON string เพียวๆ
    `;

    try {
      console.log(`[AI] Analyzing: "${description}" - ${amount} THB (${category})`);
      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();
      console.log('[AI] Raw Gemini response:', responseText);
      
      // Basic parsing assuming the model returns a valid JSON string
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('[AI] Analysis Result:', parsed);
        return parsed;
      }
      console.warn('[AI] Could not find JSON in response, returning default.');
      return { verdict: 'yellow', reason: 'ระบบวิเคราะห์ไม่ได้ครั้งนี้ ลองใหม่ทีหลังนะ' };
    } catch (error) {
      console.error('[AI] Error in analysis:', error);
      throw error;
    }
  }
  async analyzeBehavior(transactions: any[], range: 'day' | 'week' | 'month' | 'year'): Promise<{ summary: string; tips: string[]; score: number; fallback?: boolean }> {
    const total = transactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
    const expenses = transactions.filter((t: any) => (t.amount || 0) < 0);
    const income = transactions.filter((t: any) => (t.amount || 0) > 0);
    const totalExpense = expenses.reduce((s: number, t: any) => s + Math.abs(t.amount || 0), 0);
    const totalIncome = income.reduce((s: number, t: any) => s + (t.amount || 0), 0);

    const rangeInsights: Record<string, string> = {
      day: `วันนี้ วิเคราะห์ความวู่วามในการใช้เงินรายวัน เน้นตรวจสอบว่าวันนี้มีการตัดสินใจใช้เงินแบบอารมณ์ไหม? ซื้ออะไรโดยไม่จำเป็นบ้าง? ถ้าทำทุกวันจะกระทบชีวิตอย่างไร?`,
      week: `สัปดาห์นี้ วิเคราะห์ Pattern พฤติกรรมซ้ำๆ เน้นค้นหาว่ามีวันใดในสัปดาห์ที่ใช้เงินมากผิดปกติไหม? มีนิสัยการใช้จ่ายที่อันตรายซ่อนอยู่ไหม? เช่น ทุกวันศุกร์ฟุ่มเฟือย`,
      month: `เดือนนี้ วิเคราะห์ภาพรวมงบประมาณและการบริหารเงิน เน้นทำนายว่าเงินจะพอถึงสิ้นเดือนหรือเปล่า? อัตราส่วนรายจ่ายต่อรายรับเป็นอย่างไร? มีหมวดหมู่ไหนที่บวมเกินไป?`,
      year: `ปีนี้ วิเคราะห์เส้นทางความมั่งคั่งและเป้าหมายชีวิต เน้นประเมินว่าปีนี้รวยขึ้นหรือจนลง? มีโอกาสถึงเป้าหมายการออมประจำปีไหม? แนวโน้มทางการเงินในระยะยาวเป็นอย่างไร?`
    };

    const prompt = `
      คุณคือ "FinTrack AI" ที่ปรึกษาการเงินอัจฉริยะที่ปากร้ายแต่หวังดี พูดภาษาไทยกวนๆ ตลกแต่แม่นยำ
      ห้ามพูดน้ำ ให้ตรงจุดและเจ็บแสบ แต่ให้คำแนะนำที่เป็นประโยชน์จริงๆ

      โจทย์การวิเคราะห์: ${rangeInsights[range]}

      ข้อมูลธุรกรรม:
      - จำนวนรายการทั้งหมด: ${transactions.length} รายการ
      - รายรับรวม: +${totalIncome.toFixed(0)} บาท
      - รายจ่ายรวม: -${totalExpense.toFixed(0)} บาท
      - ยอดสุทธิ: ${total >= 0 ? '+' : ''}${total.toFixed(0)} บาท
      - หมวดหมู่ที่ใช้จ่าย: ${[...new Set(expenses.map((t: any) => t.category))].join(', ') || 'ไม่มี'}
      - Top 3 รายจ่ายใหญ่สุด: ${expenses.sort((a: any, b: any) => a.amount - b.amount).slice(0, 3).map((t: any) => `${t.category}(${Math.abs(t.amount).toFixed(0)}฿)`).join(', ') || 'ไม่มี'}

      ตอบกลับเป็น JSON เท่านั้น (ห้ามใส่ markdown, code block, หรือข้อความอื่น):
      {
        "summary": "บทวิเคราะห์กวนๆ แต่จริง 2-3 ประโยค ที่แทงใจดำผู้ใช้",
        "tips": ["คำแนะนำที่ 1 สั้นๆ แต่ทรงพลัง", "คำแนะนำที่ 2", "คำแนะนำที่ 3"],
        "score": <คะแนน 0-100 วัดสุขภาพทางการเงิน: 80+=ดีมาก, 60-79=พอใช้, 40-59=น่าห่วง, <40=วิกฤต>
      }
    `;

    try {
      console.log(`[AI Behavior] Analyzing ${range} data (${transactions.length} transactions)`);
      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();
      console.log('[AI Behavior] Raw response:', responseText);
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return this.getStaticWisdom(range, total);
    } catch (error: any) {
      console.warn('[AI Behavior] Gemini error, using static wisdom fallback:', error?.status);
      return this.getStaticWisdom(range, total);
    }
  }

  private getStaticWisdom(range: string, netBalance: number): { summary: string; tips: string[]; score: number; fallback: boolean } {
    const wisdoms = [
      { summary: `ช่วงนี้การเงินของคุณอยู่ในเกณฑ์ปกติ ยอดสุทธิ ${netBalance.toFixed(0)} บาท ถ้าอยากรวยเร็วขึ้น ลองตัดอะไรที่ไม่จำเป็นออกสักหน่อยนะครับ`, tips: ['พยายามออมเงินให้ได้อย่างน้อย 10% ของรายได้', 'จดรายจ่ายทุกวันเพื่อเห็นภาพรวม', 'หลีกเลี่ยงการใช้จ่ายแบบอารมณ์'], score: 65, fallback: true },
      { summary: `ดูจากข้อมูลแล้ว คุณใช้เงินพอๆ กับที่หาได้ ซึ่งก็ไม่ได้แย่ แต่ถ้าอยากมีเงินเก็บมากขึ้น ต้องลดรายจ่ายลงหน่อยแล้วครับ`, tips: ['วางแผนงบประมาณล่วงหน้าทุกเดือน', 'ตั้งเป้าหมายการออมให้ชัดเจน', 'ระวังรายจ่ายเล็กๆ น้อยๆ ที่สะสมกันมาก'], score: 60, fallback: true },
      { summary: `ข้อมูลของคุณบอกว่ารายรับและรายจ่ายใกล้เคียงกัน นี่คือสัญญาณให้เริ่มออมเงินฉุกเฉินให้ได้ 3-6 เดือนของค่าใช้จ่ายนะครับ`, tips: ['สร้างกองทุนฉุกเฉินก่อนเป็นอันดับแรก', 'ลองใช้กฎ 50/30/20 (จำเป็น/อยากได้/ออม)', 'ลดความถี่การทานข้าวนอกบ้าน'], score: 55, fallback: true },
    ];
    return wisdoms[Math.floor(Math.random() * wisdoms.length)];
  }
}

export const aiService = new AIService();
