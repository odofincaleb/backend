const OpenAI = require('openai');
const logger = require('../utils/logger');

// Initialize OpenAI client
const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

/**
 * Generate blog post content for a given title and campaign
 */
async function generateBlogPost(campaign, options = {}) {
  try {
    const {
      contentType = 'blog-post',
      wordCount = 1000,
      tone = 'conversational',
      includeKeywords = true,
      includeImages = false
    } = options;

    // Build the content generation prompt
    const prompt = buildContentPrompt(campaign, contentType, wordCount, tone);
    
    logger.info('Generating blog post content with OpenAI', {
      campaignId: campaign.id,
      topic: campaign.topic,
      contentType,
      wordCount,
      tone
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
        messages: [
          {
          role: 'system',
          content: 'You are an expert content writer specializing in creating engaging, SEO-optimized blog posts. Write in a professional yet accessible tone.'
          },
          {
          role: 'user',
            content: prompt
          }
        ],
      max_tokens: Math.min(wordCount * 2, 4000), // Roughly 2 tokens per word
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    const content = response.choices[0].message.content.trim();
    
    logger.info('Blog post content generated successfully', {
      campaignId: campaign.id,
      contentLength: content.length
    });

    return {
      content,
      wordCount: content.split(/\s+/).length,
      generatedAt: new Date().toISOString()
    };

    } catch (error) {
    logger.error('Error generating blog post content:', error);
    
    if (error.code === 'insufficient_quota') {
      throw new Error('OpenAI API quota exceeded. Please check your billing.');
    }
    
    if (error.code === 'invalid_api_key') {
      throw new Error('OpenAI API key not configured. Please contact support.');
    }
    
    throw new Error(`Failed to generate content: ${error.message}`);
  }
}

/**
 * Generate SEO keywords for content
 */
async function generateKeywords(topic, content) {
  try {
    const prompt = `Generate 5-10 relevant SEO keywords for a blog post about "${topic}". 
    
    Content preview: ${content.substring(0, 500)}...
    
    Return only the keywords as a comma-separated list, no explanations.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 100,
      temperature: 0.3
    });

    const keywordsText = response.choices[0].message.content.trim();
    const keywords = keywordsText.split(',').map(k => k.trim()).filter(k => k.length > 0);
    
    logger.info('Keywords generated successfully', { topic, keywordCount: keywords.length });
    
    return keywords;

    } catch (error) {
    logger.error('Error generating keywords:', error);
      return [];
    }
  }

  /**
 * Generate featured image description for DALL-E
 */
async function generateFeaturedImage(imagePrompt) {
  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `Professional blog post featured image: ${imagePrompt}. High quality, modern design, suitable for business blog.`,
      n: 1,
      size: '1024x1024',
      quality: 'standard'
    });

    const imageUrl = response.data[0].url;
    
    logger.info('Featured image generated successfully', { imagePrompt });

      return {
      url: imageUrl,
      prompt: imagePrompt,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
    logger.error('Error generating featured image:', error);
    return null;
    }
  }

  /**
 * Build content generation prompt based on campaign and options
 */
function buildContentPrompt(campaign, contentType, wordCount, tone) {
  const toneInstructions = {
    conversational: 'Write in a conversational, friendly tone as if speaking to a friend.',
    formal: 'Write in a professional, formal tone suitable for business publications.',
    humorous: 'Write with a light, humorous tone while maintaining professionalism.',
    storytelling: 'Write using storytelling techniques to engage readers emotionally.'
  };

  const writingStyleInstructions = {
    pas: 'Use the PAS (Problem-Agitate-Solution) framework: identify a problem, agitate the pain points, then provide a solution.',
    aida: 'Use the AIDA (Attention-Interest-Desire-Action) framework: grab attention, build interest, create desire, and call for action.',
    listicle: 'Structure as a numbered or bulleted list with clear headings and actionable takeaways.'
  };

  let prompt = `Write a ${wordCount}-word blog post about "${campaign.topic}".

Context: ${campaign.context}

Tone: ${toneInstructions[tone] || toneInstructions.conversational}

Writing Style: ${writingStyleInstructions[campaign.writing_style] || writingStyleInstructions.pas}

Content Type: ${contentType}

Requirements:
- Write exactly ${wordCount} words
- Use engaging headlines and subheadings
- Include actionable insights
- Make it SEO-friendly
- Write in a professional yet accessible style
- Include a compelling introduction and conclusion
- Use bullet points or numbered lists where appropriate`;

  // Add imperfection list if provided
  if (campaign.imperfection_list && campaign.imperfection_list.length > 0) {
    prompt += `\n\nAvoid these topics or approaches: ${campaign.imperfection_list.join(', ')}`;
  }

  // Add content type specific instructions
  if (contentType === 'how-to') {
    prompt += '\n\nStructure as a step-by-step guide with clear instructions.';
  } else if (contentType === 'listicle') {
    prompt += '\n\nStructure as a numbered list with detailed explanations for each point.';
  } else if (contentType === 'case-study') {
    prompt += '\n\nInclude real examples, data, and specific outcomes.';
  }

    return prompt;
  }

  /**
 * Generate titles for a campaign
 */
async function generateTitles(campaign, count = 5) {
  try {
    logger.info('Generating titles with OpenAI', {
      campaignId: campaign.id,
      topic: campaign.topic,
      count
    });

    const prompt = `Generate ${count} compelling blog post titles for a campaign about "${campaign.topic}".

Context: ${campaign.context}

Requirements:
- Each title should be engaging and click-worthy
- Titles should be SEO-friendly
- Vary the style (how-to, listicle, question-based, etc.)
- Keep titles between 50-70 characters
- Make them specific to the topic and context
- Avoid generic or vague titles

Return only the titles, one per line, without numbering or bullet points.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
        messages: [
          {
          role: 'system',
          content: 'You are an expert content strategist specializing in creating compelling, SEO-optimized blog post titles that drive engagement and clicks.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.8,
      presence_penalty: 0.2,
      frequency_penalty: 0.1
    });

    const titlesText = response.choices[0].message.content.trim();
    const titles = titlesText.split('\n')
      .map(title => title.trim())
      .filter(title => title.length > 0 && title.length <= 100)
      .slice(0, count); // Ensure we don't exceed the requested count
    
    logger.info('Titles generated successfully', {
      campaignId: campaign.id,
      requestedCount: count,
      actualCount: titles.length
    });
    
    return titles;

    } catch (error) {
    logger.error('Error generating titles:', error);
    
    if (error.code === 'insufficient_quota') {
      throw new Error('OpenAI API quota exceeded. Please check your billing.');
    }
    
    if (error.code === 'invalid_api_key') {
      throw new Error('OpenAI API key not configured. Please contact support.');
    }
    
    throw new Error(`Failed to generate titles: ${error.message}`);
  }
}

module.exports = {
  generateBlogPost,
  generateKeywords,
  generateFeaturedImage,
  generateTitles
};