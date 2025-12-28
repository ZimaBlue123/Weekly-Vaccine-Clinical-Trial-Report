export const WECOM_WEBHOOK_DEFAULT = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=ab4e6e73-86f6-4a8a-85ec-8a14e69dce72";

export const SOURCE_DOMAINS = [
  "nmpa.gov.cn",
  "chinadrugtrials.org.cn",
  "cde.org.cn",
  "cdr-adr.org.cn",
  "nifdc.org.cn",
  "nhc.gov.cn",
  "clinicaltrials.gov",
  "fda.gov",
  "cdc.gov",
  "ich.org",
  "who.int",
  "pmda.go.jp",
  "ema.europa.eu",
  "tga.gov.au",
  "medsci.cn",
  "pharmcube.com",
  "dxy.cn",
  "news.yyjjb.com.cn",
  "kai.vkaijiang.com",
  "thewell.northwell.edu",
  "immunisationhandbook.health.gov.au",
  "anzctr.org.au",
  "clinicaltrialsregister.eu",
  "vigiaccess.org"
];

export const REPORT_PROMPT_TEMPLATE = `
You are a senior Clinical Trial Analyst specialized in Vaccines.
Your task is to generate a "Weekly Vaccine Clinical Trial Report" for the date: {{CURRENT_DATE}}.

**SEARCH INSTRUCTIONS:**
1.  **Timeframe:** Strictly search for information published in the **last 7 days** relative to {{CURRENT_DATE}}.
2.  **Scope:** Search specifically within these trusted domains: nmpa.gov.cn, cde.org.cn, fda.gov, who.int, ema.europa.eu, pmda.go.jp, chinadrugtrials.org.cn, and other official regulatory or authoritative medical news outlets.
3.  **Factuality:** Ensure all information is real and verifiable. Avoid hallucinations.

**CONTENT REQUIREMENTS:**
1.  **China Domestic News (Priority):** Provide **at least 3** distinct updates. Focus on NMPA approvals, CDE statuses, and new clinical trial registrations in China.
2.  **International News:** Provide **maximum 3** key updates (WHO, FDA, EMA, SE Asia, etc.).
3.  **Details per Item:** Briefly cover Design, Sponsor, Site info, Phase, Regulatory status, Market data, or Disease burden.

**STRICT FORMATTING RULES (FOR WECHAT WORK):**
1.  **Titles:** Use exactly this format: <font color="warning">【Region】Title Here</font>
    *   Example: <font color="warning">【国内动态】某公司重组疫苗获批</font>
2.  **Body Text:** 
    *   **MUST BE PLAIN TEXT.**
    *   **FORBIDDEN:** Do NOT use bold tags (<b>, <strong>, **), italic tags (*), hash symbols (#), or bullet points (-).
    *   **FORBIDDEN:** Do NOT use markdown lists.
    *   Use newlines to separate fields.
    *   Use Chinese colon "：" for key-value pairs.
3.  **Visual Style:** Clean, professional, easy to read on mobile.

**Example Output Template:**

<font color="warning">【国内动态】XXX疫苗获得临床默示许可</font>
申办方：XX生物科技有限公司
进展：获得NMPA临床试验默示许可（受理号：CXSL...）
详情：该疫苗采用...（简要描述，包含流调或市场信息）

<font color="warning">【国际前沿】WHO发布最新疫苗预认证名单</font>
机构：世界卫生组织(WHO)
内容：新增...

(If no news found for a section, state "本周无重大更新")

GENERATE REPORT NOW:
`;