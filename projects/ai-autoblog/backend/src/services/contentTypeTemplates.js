/**
 * Content Type Templates System
 * Manages the 15 different content type templates and their variables
 */

class ContentTypeTemplates {
  constructor() {
    this.templates = {
      how_to_guide: {
        name: "How-To Guide",
        description: "Step-by-step instructional content",
        prompt: "You are an expert SEO content writer. Write a detailed how-to guide on [TOPIC]. Audience: [AUDIENCE]. Primary keyword: [KEYWORD]. Structure the blog with step-by-step instructions, numbered lists, practical examples, and a summary checklist at the end. Include a clear introduction, detailed sections, and a conclusion with a CTA: [CTA]. Add 3–5 FAQ questions with short answers. Target length: [WORD_COUNT]. Tone: [TONE].",
        variables: ["TOPIC", "AUDIENCE", "KEYWORD", "CTA", "WORD_COUNT", "TONE"]
      },
      listicle: {
        name: "Listicle",
        description: "Top X style posts with numbered lists",
        prompt: "Write a [NUMBER]-point listicle blog post about [TOPIC]. Audience: [AUDIENCE]. Primary keyword: [KEYWORD]. Each point should have a heading, explanation, and example. Use bullet points and tables where relevant. Add an engaging introduction, a key takeaways section at the end, and FAQs. Tone: [TONE]. Target length: [WORD_COUNT].",
        variables: ["NUMBER", "TOPIC", "AUDIENCE", "KEYWORD", "TONE", "WORD_COUNT"]
      },
      comparison_post: {
        name: "Comparison Post",
        description: "Compare products, services, or strategies",
        prompt: "Write a comparison blog post on [PRODUCT_A] vs [PRODUCT_B]. Audience: [AUDIENCE]. Primary keyword: [KEYWORD]. Include pros, cons, pricing, features, and a side-by-side comparison table. Add a conclusion with a recommendation and CTA: [CTA]. Include FAQs (3–5). Tone: [TONE]. Target length: [WORD_COUNT].",
        variables: ["PRODUCT_A", "PRODUCT_B", "AUDIENCE", "KEYWORD", "CTA", "TONE", "WORD_COUNT"]
      },
      review_post: {
        name: "Review Post",
        description: "Detailed reviews of tools, products, or services",
        prompt: "Write a detailed review blog post about [PRODUCT_SERVICE]. Audience: [AUDIENCE]. Primary keyword: [KEYWORD]. Cover introduction, features, benefits, pricing, pros and cons, who it's best for, and alternatives. Include bullet lists and tables for clarity. Add FAQs and a final verdict with a CTA: [CTA]. Tone: [TONE]. Target length: [WORD_COUNT].",
        variables: ["PRODUCT_SERVICE", "AUDIENCE", "KEYWORD", "CTA", "TONE", "WORD_COUNT"]
      },
      ultimate_guide: {
        name: "Ultimate Guide",
        description: "Comprehensive coverage of a topic",
        prompt: "You are an expert SEO content writer. Write an ultimate guide blog post on [TOPIC]. Audience: [AUDIENCE]. Primary keyword: [KEYWORD]. Cover definitions, benefits, strategies, tools, mistakes to avoid, and future trends. Use H2/H3 subheadings, bullet lists, tables, and examples. Add FAQs and a strong CTA at the end: [CTA]. Tone: [TONE]. Target length: [WORD_COUNT].",
        variables: ["TOPIC", "AUDIENCE", "KEYWORD", "CTA", "TONE", "WORD_COUNT"]
      },
      case_study: {
        name: "Case Study/Storytelling",
        description: "Real examples and success stories",
        prompt: "Write a storytelling blog post in the format of a case study about [TOPIC_CLIENT_BRAND]. Audience: [AUDIENCE]. Primary keyword: [KEYWORD]. Structure as: Background → Challenges → Solutions → Results → Key Lessons. Use narrative tone with data, quotes, or examples. Add FAQs at the end. CTA: [CTA]. Target length: [WORD_COUNT].",
        variables: ["TOPIC_CLIENT_BRAND", "AUDIENCE", "KEYWORD", "CTA", "WORD_COUNT"]
      },
      problem_solution: {
        name: "Problem-Solution Post",
        description: "Address pain points with solutions",
        prompt: "Write a problem-solution blog post about [TOPIC]. Audience: [AUDIENCE]. Primary keyword: [KEYWORD]. Start with the pain point, describe why it's a problem, then present a solution step-by-step. Use bullet points and real-world examples. Add FAQs and a persuasive conclusion with CTA: [CTA]. Tone: [TONE]. Target length: [WORD_COUNT].",
        variables: ["TOPIC", "AUDIENCE", "KEYWORD", "CTA", "TONE", "WORD_COUNT"]
      },
      trending_topic: {
        name: "Trending Topic/News Analysis",
        description: "Fresh, timely content on current events",
        prompt: "Write a trending topic blog post analyzing [LATEST_TREND_EVENT]. Audience: [AUDIENCE]. Primary keyword: [KEYWORD]. Provide background, implications, expert opinions, and action steps. Structure with subheadings and bullet lists. Add a conclusion with CTA: [CTA]. FAQs optional. Tone: [TONE]. Target length: [WORD_COUNT].",
        variables: ["LATEST_TREND_EVENT", "AUDIENCE", "KEYWORD", "CTA", "TONE", "WORD_COUNT"]
      },
      thought_leadership: {
        name: "Thought Leadership Post",
        description: "Position yourself as an expert authority",
        prompt: "Write a thought leadership blog post sharing insights on [TOPIC]. Audience: [AUDIENCE]. Primary keyword: [KEYWORD]. Use authoritative but approachable tone. Include personal insights, industry trends, expert references, and forward-looking predictions. Structure with H2/H3s. Add FAQs. Conclusion with CTA: [CTA]. Target length: [WORD_COUNT].",
        variables: ["TOPIC", "AUDIENCE", "KEYWORD", "CTA", "WORD_COUNT"]
      },
      beginners_guide: {
        name: "Beginner's Guide",
        description: "Educational content for entry-level readers",
        prompt: "Write a beginner's guide blog post on [TOPIC]. Audience: [BEGINNERS_NEWBIES]. Primary keyword: [KEYWORD]. Break concepts into simple steps, use analogies, bullet points, and examples. Add a glossary of key terms and FAQs. End with a conclusion and CTA: [CTA]. Tone: friendly and educational. Target length: [WORD_COUNT].",
        variables: ["TOPIC", "BEGINNERS_NEWBIES", "KEYWORD", "CTA", "WORD_COUNT"]
      },
      advanced_guide: {
        name: "Advanced/Expert Guide",
        description: "Deep content for experienced audiences",
        prompt: "Write an advanced blog post on [TOPIC] for experienced [AUDIENCE]. Primary keyword: [KEYWORD]. Cover deep strategies, expert techniques, and advanced tools. Use industry terminology, data, and case examples. Add FAQs. End with a CTA: [CTA]. Tone: authoritative and professional. Target length: [WORD_COUNT].",
        variables: ["TOPIC", "AUDIENCE", "KEYWORD", "CTA", "WORD_COUNT"]
      },
      faq_post: {
        name: "FAQ Post",
        description: "Answer common questions for voice/AI searches",
        prompt: "Write a FAQ-style blog post about [TOPIC]. Audience: [AUDIENCE]. Primary keyword: [KEYWORD]. Create 10–15 common questions with detailed answers. Format with H2 for each question and schema-friendly answers. Add a conclusion with CTA: [CTA]. Tone: [TONE]. Target length: [WORD_COUNT].",
        variables: ["TOPIC", "AUDIENCE", "KEYWORD", "CTA", "TONE", "WORD_COUNT"]
      },
      checklist_template: {
        name: "Checklist/Template Post",
        description: "Actionable, practical step-by-step content",
        prompt: "Write a checklist-style blog post on [TOPIC]. Audience: [AUDIENCE]. Primary keyword: [KEYWORD]. Provide a step-by-step checklist with tick-box style bullet points. Add a downloadable version CTA: [CTA]. Include FAQs and key takeaways. Tone: [TONE]. Target length: [WORD_COUNT].",
        variables: ["TOPIC", "AUDIENCE", "KEYWORD", "CTA", "TONE", "WORD_COUNT"]
      },
      opinion_editorial: {
        name: "Opinion/Editorial Post",
        description: "Express strong viewpoints and opinions",
        prompt: "Write an editorial opinion blog post about [TOPIC]. Audience: [AUDIENCE]. Primary keyword: [KEYWORD]. Share a clear stance, provide arguments for and against, and back with examples/data. Add FAQs. Conclusion should reinforce your position and CTA: [CTA]. Tone: persuasive and authoritative. Target length: [WORD_COUNT].",
        variables: ["TOPIC", "AUDIENCE", "KEYWORD", "CTA", "TONE", "WORD_COUNT"]
      },
      resource_roundup: {
        name: "Resource Roundup Post",
        description: "Curate tools, tips, or external resources",
        prompt: "Write a resource roundup blog post listing the best [TOOLS_RESOURCES_BOOKS] for [TOPIC]. Audience: [AUDIENCE]. Primary keyword: [KEYWORD]. Include a short intro for each resource, pros/cons, and links. Use a comparison table if relevant. Add FAQs and CTA: [CTA]. Tone: [TONE]. Target length: [WORD_COUNT].",
        variables: ["TOOLS_RESOURCES_BOOKS", "TOPIC", "AUDIENCE", "KEYWORD", "CTA", "TONE", "WORD_COUNT"]
      }
    };
  }

  /**
   * Get all available content types
   * @returns {Object} All content type templates
   */
  getAllContentTypes() {
    return this.templates;
  }

  /**
   * Get a specific content type template
   * @param {string} type - Content type key
   * @returns {Object|null} Content type template or null
   */
  getContentType(type) {
    return this.templates[type] || null;
  }

  /**
   * Get content types by keys
   * @param {Array} types - Array of content type keys
   * @returns {Object} Selected content type templates
   */
  getContentTypes(types) {
    const selected = {};
    types.forEach(type => {
      if (this.templates[type]) {
        selected[type] = this.templates[type];
      }
    });
    return selected;
  }

  /**
   * Build a prompt for a specific content type with variables
   * @param {string} type - Content type key
   * @param {Object} variables - Variable values
   * @param {Object} campaign - Campaign data for smart defaults
   * @returns {string} Built prompt
   */
  buildPrompt(type, variables = {}, campaign = {}) {
    const template = this.getContentType(type);
    if (!template) {
      throw new Error(`Unknown content type: ${type}`);
    }

    // Get smart defaults from campaign
    const smartDefaults = this.getSmartDefaults(campaign);
    
    // Merge variables with smart defaults
    const mergedVariables = { ...smartDefaults, ...variables };
    
    // Build the prompt by replacing variables
    let prompt = template.prompt;
    
    // Replace all variables in the prompt
    Object.keys(mergedVariables).forEach(key => {
      const placeholder = `[${key}]`;
      const value = mergedVariables[key] || `[${key}]`; // Keep placeholder if no value
      prompt = prompt.replace(new RegExp(placeholder, 'g'), value);
    });

    return prompt;
  }

  /**
   * Get smart defaults based on campaign data
   * @param {Object} campaign - Campaign data
   * @returns {Object} Smart default variables
   */
  getSmartDefaults(campaign) {
    return {
      TOPIC: campaign.topic || "the topic",
      AUDIENCE: campaign.context || "general audience",
      KEYWORD: campaign.topic || "main keyword",
      TONE: campaign.tone_of_voice || "conversational",
      WORD_COUNT: "1500-2000",
      CTA: "Learn more about our services",
      NUMBER: "10",
      PRODUCT_A: "Product A",
      PRODUCT_B: "Product B",
      PRODUCT_SERVICE: "the product/service",
      TOPIC_CLIENT_BRAND: campaign.topic || "the topic",
      LATEST_TREND_EVENT: "the latest trend",
      BEGINNERS_NEWBIES: "beginners",
      TOOLS_RESOURCES_BOOKS: "tools and resources"
    };
  }

  /**
   * Get all unique variables across all content types
   * @returns {Array} Array of unique variable names
   */
  getAllVariables() {
    const variables = new Set();
    Object.values(this.templates).forEach(template => {
      template.variables.forEach(variable => {
        variables.add(variable);
      });
    });
    return Array.from(variables);
  }

  /**
   * Validate content type selection
   * @param {Array} types - Selected content types
   * @returns {Object} Validation result
   */
  validateContentTypes(types) {
    if (!Array.isArray(types)) {
      return { valid: false, error: "Content types must be an array" };
    }

    if (types.length === 0) {
      return { valid: false, error: "At least one content type must be selected" };
    }

    if (types.length > 5) {
      return { valid: false, error: "Maximum 5 content types allowed" };
    }

    const validTypes = Object.keys(this.templates);
    const invalidTypes = types.filter(type => !validTypes.includes(type));
    
    if (invalidTypes.length > 0) {
      return { valid: false, error: `Invalid content types: ${invalidTypes.join(', ')}` };
    }

    return { valid: true };
  }

  /**
   * Get a random content type from the selected types
   * @param {Array} types - Selected content types
   * @returns {string} Random content type key
   */
  getRandomContentType(types) {
    if (!types || types.length === 0) {
      // Fallback to all types if none selected
      types = Object.keys(this.templates);
    }
    
    const randomIndex = Math.floor(Math.random() * types.length);
    return types[randomIndex];
  }
}

module.exports = new ContentTypeTemplates();
