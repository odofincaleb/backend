const { Pool } = require('pg');
const OpenAI = require('openai');
const axios = require('axios');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Main Lambda handler for content publishing
 */
exports.handler = async (event, context) => {
  console.log('Content publisher Lambda started');
  
  try {
    // Get campaigns that are ready to publish
    const campaigns = await getReadyCampaigns();
    
    if (campaigns.length === 0) {
      console.log('No campaigns ready for publishing');
      return { statusCode: 200, body: 'No campaigns to process' };
    }

    const results = [];
    
    for (const campaign of campaigns) {
      try {
        const result = await processCampaign(campaign);
        results.push(result);
      } catch (error) {
        console.error(`Error processing campaign ${campaign.id}:`, error);
        await logError(campaign.id, error.message);
        results.push({ campaignId: campaign.id, success: false, error: error.message });
      }
    }

    console.log(`Processed ${results.length} campaigns`);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Content publishing completed',
        results
      })
    };

  } catch (error) {
    console.error('Lambda execution error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};

/**
 * Get campaigns that are ready to publish
 */
async function getReadyCampaigns() {
  const query = `
    SELECT c.id, c.user_id, c.topic, c.context, c.tone_of_voice, c.writing_style,
           c.imperfection_list, c.schedule, c.wordpress_site_id,
           u.subscription_tier, u.openai_key_encrypted, u.dalle_key_encrypted,
           u.posts_published_this_month, u.total_posts_published,
           ws.site_url, ws.username, ws.password_encrypted, ws.api_endpoint
    FROM campaigns c
    JOIN users u ON c.user_id = u.id
    LEFT JOIN wordpress_sites ws ON c.wordpress_site_id = ws.id
    WHERE c.status = 'active' 
      AND c.next_publish_at <= NOW()
      AND u.is_active = true
    ORDER BY c.next_publish_at ASC
    LIMIT 10
  `;

  const result = await pool.query(query);
  return result.rows;
}

/**
 * Process a single campaign
 */
async function processCampaign(campaign) {
  console.log(`Processing campaign ${campaign.id} for user ${campaign.user_id}`);

  // Check user's post limits
  if (!await checkPostLimits(campaign)) {
    throw new Error('User has reached their post limit');
  }

  // Generate content
  const content = await generateContent(campaign);
  
  // Humanize content
  const humanizedContent = await humanizeContent(content, campaign.imperfection_list);
  
  // Generate featured image
  const featuredImageUrl = await generateFeaturedImage(campaign.topic, campaign.context);
  
  // Publish to WordPress
  const wordpressResult = await publishToWordPress(campaign, humanizedContent, featuredImageUrl);
  
  // Update campaign schedule
  await updateCampaignSchedule(campaign.id, campaign.schedule);
  
  // Update user's post counts
  await updateUserPostCounts(campaign.user_id, campaign.subscription_tier);
  
  // Log success
  await logSuccess(campaign.id, wordpressResult);

  return {
    campaignId: campaign.id,
    success: true,
    postId: wordpressResult.postId,
    postUrl: wordpressResult.postUrl
  };
}

/**
 * Check if user has reached their post limits
 */
async function checkPostLimits(campaign) {
  const { subscription_tier, posts_published_this_month, total_posts_published } = campaign;

  if (subscription_tier === 'trial') {
    return total_posts_published < 5;
  } else if (subscription_tier === 'hobbyist') {
    return posts_published_this_month < 25;
  } else if (subscription_tier === 'professional') {
    return true; // unlimited
  }

  return false;
}

/**
 * Generate content using OpenAI
 */
async function generateContent(campaign) {
  const { topic, context, tone_of_voice, writing_style } = campaign;
  
  // Get appropriate API key
  const apiKey = await getApiKey(campaign);
  
  const openaiClient = new OpenAI({
    apiKey: apiKey
  });

  const prompt = `
    You are a professional content writer creating a blog post for a business.
    
    Business Context: ${context}
    Topic: ${topic}
    Tone: ${tone_of_voice}
    Writing Style: ${writing_style}
    
    Create a comprehensive, engaging blog post that:
    1. Addresses the topic from the perspective of the business context
    2. Uses the specified tone of voice
    3. Follows the ${writing_style} framework
    4. Is between 800-1200 words
    5. Includes relevant headings and subheadings
    6. Naturally incorporates the business context without being overly promotional
    7. Provides genuine value to readers
    
    Format the response as HTML with proper heading tags (h1, h2, h3), paragraphs, and lists.
  `;

  const response = await openaiClient.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: 'You are a professional content writer specializing in business blog posts.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 2000,
    temperature: 0.7
  });

  return response.choices[0].message.content;
}

/**
 * Humanize content with imperfections
 */
async function humanizeContent(content, imperfectionList) {
  if (!imperfectionList || imperfectionList.length === 0) {
    return content;
  }

  // Apply humanization rules
  let humanizedContent = content;

  // Add some natural variations
  imperfectionList.forEach(imperfection => {
    switch (imperfection) {
      case 'add_personal_opinion':
        humanizedContent = addPersonalOpinion(humanizedContent);
        break;
      case 'add_typo':
        humanizedContent = addTypo(humanizedContent);
        break;
      case 'add_casual_language':
        humanizedContent = addCasualLanguage(humanizedContent);
        break;
      case 'add_contractions':
        humanizedContent = addContractions(humanizedContent);
        break;
    }
  });

  return humanizedContent;
}

/**
 * Generate featured image using DALL-E
 */
async function generateFeaturedImage(topic, context) {
  try {
    const prompt = `Create a professional, modern blog post featured image for the topic: "${topic}". The image should be relevant to the business context and suitable for a blog header. Style: clean, modern, professional, high quality.`;

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      size: '1792x1024',
      quality: 'standard',
      n: 1
    });

    return response.data[0].url;
  } catch (error) {
    console.error('Error generating featured image:', error);
    return null; // Continue without image if generation fails
  }
}

/**
 * Publish content to WordPress
 */
async function publishToWordPress(campaign, content, featuredImageUrl) {
  const { site_url, username, password_encrypted, api_endpoint } = campaign;
  
  if (!api_endpoint) {
    throw new Error('No WordPress site configured for this campaign');
  }

  // Decrypt password (in real implementation, you'd use proper decryption)
  const password = password_encrypted; // Simplified for this example

  const auth = Buffer.from(`${username}:${password}`).toString('base64');

  // Create the post data
  const postData = {
    title: extractTitleFromContent(content),
    content: content,
    status: 'publish',
    featured_media: featuredImageUrl ? await uploadFeaturedImage(api_endpoint, featuredImageUrl, auth) : null
  };

  const response = await axios.post(`${api_endpoint}/posts`, postData, {
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    }
  });

  return {
    postId: response.data.id,
    postUrl: response.data.link
  };
}

/**
 * Upload featured image to WordPress
 */
async function uploadFeaturedImage(apiEndpoint, imageUrl, auth) {
  try {
    // Download image
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    
    // Upload to WordPress
    const uploadResponse = await axios.post(`${apiEndpoint}/media`, imageResponse.data, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'image/jpeg',
        'Content-Disposition': 'attachment; filename="featured-image.jpg"'
      }
    });

    return uploadResponse.data.id;
  } catch (error) {
    console.error('Error uploading featured image:', error);
    return null;
  }
}

/**
 * Extract title from content
 */
function extractTitleFromContent(content) {
  const titleMatch = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (titleMatch) {
    return titleMatch[1].replace(/<[^>]*>/g, '').trim();
  }
  
  // Fallback: use first 50 characters
  const textContent = content.replace(/<[^>]*>/g, '');
  return textContent.substring(0, 50).trim() + '...';
}

/**
 * Get appropriate API key for the user
 */
async function getApiKey(campaign) {
  const { subscription_tier, openai_key_encrypted } = campaign;
  
  if (subscription_tier === 'trial') {
    return process.env.OPENAI_API_KEY; // Use internal key
  } else {
    // In real implementation, decrypt the user's key
    return openai_key_encrypted || process.env.OPENAI_API_KEY;
  }
}

/**
 * Update campaign schedule
 */
async function updateCampaignSchedule(campaignId, schedule) {
  const scheduleHours = parseInt(schedule.replace('h', ''));
  const nextPublishAt = new Date(Date.now() + scheduleHours * 60 * 60 * 1000);

  await pool.query(
    'UPDATE campaigns SET next_publish_at = $1 WHERE id = $2',
    [nextPublishAt, campaignId]
  );
}

/**
 * Update user's post counts
 */
async function updateUserPostCounts(userId, subscriptionTier) {
  await pool.query(
    'UPDATE users SET posts_published_this_month = posts_published_this_month + 1, total_posts_published = total_posts_published + 1 WHERE id = $1',
    [userId]
  );
}

/**
 * Log success
 */
async function logSuccess(campaignId, wordpressResult) {
  await pool.query(
    `INSERT INTO logs (campaign_id, event_type, message, severity, metadata)
     VALUES ($1, 'post_published', 'Content published successfully', 'info', $2)`,
    [campaignId, JSON.stringify({ postId: wordpressResult.postId, postUrl: wordpressResult.postUrl })]
  );
}

/**
 * Log error
 */
async function logError(campaignId, errorMessage) {
  await pool.query(
    `INSERT INTO logs (campaign_id, event_type, message, severity)
     VALUES ($1, 'publish_error', $2, 'error')`,
    [campaignId, errorMessage]
  );
}

// Helper functions for content humanization
function addPersonalOpinion(content) {
  const opinions = [
    'In my experience,',
    'I believe that',
    'From what I\'ve observed,',
    'Personally, I think'
  ];
  
  const randomOpinion = opinions[Math.floor(Math.random() * opinions.length)];
  return content.replace(/<p>/, `<p>${randomOpinion} `);
}

function addTypo(content) {
  // Add a simple typo (in real implementation, this would be more sophisticated)
  return content.replace(/the/g, 'teh', 1);
}

function addCasualLanguage(content) {
  return content.replace(/therefore/g, 'so').replace(/however/g, 'but');
}

function addContractions(content) {
  return content.replace(/do not/g, "don't").replace(/will not/g, "won't");
}

