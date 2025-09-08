const OpenAI = require('openai');
const logger = require('../utils/logger');

class ContentGenerator {
  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } else {
      this.openai = null;
      logger.warn('OpenAI API key not configured. Content generation will be disabled.');
    }
  }

  /**
   * Generate a blog post based on campaign parameters
   * @param {Object} campaign - Campaign data
   * @param {Object} options - Additional options
   * @returns {Object} Generated content
   */
  async generateBlogPost(campaign, options = {}) {
    try {
      if (!this.openai) {
        throw new Error('OpenAI API key not configured. Cannot generate content.');
      }

      logger.info(`Generating content for campaign: ${campaign.topic}`);

      // Build the prompt based on campaign parameters
      const prompt = this.buildPrompt(campaign, options);
      
      // Generate content using OpenAI
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert content writer who creates engaging, SEO-optimized blog posts. Always write in the specified tone and style, and include relevant keywords naturally."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      });

      const generatedContent = completion.choices[0].message.content;
      
      // Extract title and content
      const { title, content } = this.parseGeneratedContent(generatedContent);
      
      // Generate keywords
      const keywords = await this.generateKeywords(campaign.topic, content);
      
      // Generate featured image prompt
      const imagePrompt = this.generateImagePrompt(campaign.topic, title);

      logger.info(`Successfully generated content for campaign: ${campaign.topic}`);

      return {
        title,
        content,
        keywords,
        imagePrompt,
        wordCount: content.split(' ').length,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Content generation failed:', error);
      throw new Error(`Content generation failed: ${error.message}`);
    }
  }

  /**
   * Build the prompt for content generation
   */
  buildPrompt(campaign, options) {
    const { topic, context, toneOfVoice, writingStyle, imperfectionList } = campaign;
    
    let prompt = `Write a comprehensive blog post about "${topic}".\n\n`;
    
    // Add context
    if (context) {
      prompt += `Context: ${context}\n\n`;
    }
    
    // Add tone of voice
    const toneInstructions = {
      'conversational': 'Write in a conversational, friendly tone as if talking to a friend.',
      'formal': 'Write in a professional, formal tone suitable for business audiences.',
      'humorous': 'Write with humor and wit, making it entertaining while informative.',
      'storytelling': 'Write using storytelling techniques, with engaging narratives and examples.'
    };
    prompt += `Tone: ${toneInstructions[toneOfVoice] || toneInstructions['conversational']}\n\n`;
    
    // Add writing style
    const styleInstructions = {
      'pas': 'Use the Problem-Agitate-Solution (PAS) framework: identify a problem, agitate it, then provide a solution.',
      'aida': 'Use the AIDA framework: Attention, Interest, Desire, Action.',
      'listicle': 'Write as a numbered list with clear headings and actionable points.'
    };
    prompt += `Style: ${styleInstructions[writingStyle] || styleInstructions['pas']}\n\n`;
    
    // Add imperfection list (things to avoid)
    if (imperfectionList && imperfectionList.length > 0) {
      prompt += `Avoid these topics/approaches: ${imperfectionList.join(', ')}\n\n`;
    }
    
    // Add requirements
    prompt += `Requirements:
- Write a compelling title
- Include an engaging introduction
- Use subheadings to structure the content
- Include actionable tips or insights
- End with a strong conclusion
- Aim for 800-1500 words
- Make it SEO-friendly with natural keyword usage
- Include relevant examples or case studies

Format the response as:
TITLE: [Your title here]
CONTENT: [Your full blog post content here]`;

    return prompt;
  }

  /**
   * Parse the generated content to extract title and content
   */
  parseGeneratedContent(generatedText) {
    const titleMatch = generatedText.match(/TITLE:\s*(.+?)(?:\n|$)/i);
    const contentMatch = generatedText.match(/CONTENT:\s*([\s\S]+)/i);
    
    const title = titleMatch ? titleMatch[1].trim() : 'Generated Blog Post';
    const content = contentMatch ? contentMatch[1].trim() : generatedText;
    
    return { title, content };
  }

  /**
   * Generate relevant keywords for the content
   */
  async generateKeywords(topic, content) {
    try {
      if (!this.openai) {
        logger.warn('OpenAI not available, using fallback keywords');
        return [topic.toLowerCase(), 'blog', 'article', 'tips', 'guide'];
      }

      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an SEO expert. Generate 5-8 relevant keywords for the given topic and content."
          },
          {
            role: "user",
            content: `Topic: ${topic}\n\nContent: ${content.substring(0, 500)}...\n\nGenerate 5-8 relevant SEO keywords as a JSON array.`
          }
        ],
        max_tokens: 200,
        temperature: 0.3
      });

      const response = completion.choices[0].message.content;
      
      // Try to parse as JSON, fallback to simple extraction
      try {
        return JSON.parse(response);
      } catch {
        // Extract keywords from text response
        return response.split('\n')
          .map(line => line.replace(/^\d+\.\s*/, '').replace(/[-\*]/g, '').trim())
          .filter(keyword => keyword.length > 0)
          .slice(0, 8);
      }
    } catch (error) {
      logger.error('Keyword generation failed:', error);
      // Fallback to basic keywords
      return [topic.toLowerCase(), 'blog', 'article', 'tips', 'guide'];
    }
  }

  /**
   * Generate image prompt for DALL-E
   */
  generateImagePrompt(topic, title) {
    return `A professional, high-quality image related to "${topic}". ${title}. Clean, modern style, suitable for a blog post header. No text overlay.`;
  }

  /**
   * Generate a featured image using DALL-E
   */
  async generateFeaturedImage(imagePrompt) {
    try {
      if (!this.openai) {
        logger.warn('OpenAI not available, skipping image generation');
        return null;
      }

      logger.info('Generating featured image with DALL-E');
      
      const response = await this.openai.images.generate({
        model: "dall-e-3",
        prompt: imagePrompt,
        size: "1024x1024",
        quality: "standard",
        n: 1
      });

      const imageUrl = response.data[0].url;
      logger.info('Featured image generated successfully');
      
      return imageUrl;
    } catch (error) {
      logger.error('Image generation failed:', error);
      return null;
    }
  }
}

module.exports = new ContentGenerator();
