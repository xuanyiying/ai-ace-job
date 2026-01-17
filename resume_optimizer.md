classDiagram
direction BT
class accounts {
   text accountId
   text providerId
   text userId
   text accessToken
   text refreshToken
   text idToken
   timestamp(3) accessTokenExpiresAt
   timestamp(3) refreshTokenExpiresAt
   text scope
   text password
   timestamp(3) createdAt
   timestamp(3) updatedAt
   text id
}
class agent_sessions {
   text userId
   text agentType
   text status
   jsonb input
   jsonb output
   jsonb tokenUsage
   double precision cost
   timestamp(3) startedAt
   timestamp(3) completedAt
   jsonb metadata
   timestamp(3) createdAt
   timestamp(3) updatedAt
   text id
}
class ai_call_logs {
   text model
   text provider
   text scenario
   text requestContent
   text responseContent
   integer inputTokens
   integer outputTokens
   integer latency
   boolean success
   text errorCode
   text errorMessage
   text stackTrace
   text userId
   timestamp(3) timestamp
   text id
}
class ai_degradation_logs {
   text model
   text provider
   text reason
   text fallbackModel
   text fallbackProvider
   timestamp(3) timestamp
   text id
}
class ai_retry_logs {
   text model
   text provider
   integer attempt
   integer maxAttempts
   text errorCode
   text errorMessage
   timestamp(3) timestamp
   text id
}
class audit_logs {
   text action
   text resource
   text userId
   jsonb details
   timestamp(3) timestamp
   text id
}
class conversations {
   text userId
   text title
   timestamp(3) createdAt
   timestamp(3) updatedAt
   timestamp(3) lastMessageAt
   integer messageCount
   boolean isActive
   text id
}
class generated_pdfs {
   text userId
   text optimizationId
   text templateId
   text fileUrl
   integer fileSize
   integer downloadCount
   timestamp(3) createdAt
   timestamp(3) expiresAt
   text id
}
class interview_messages {
   text sessionId
   "messagerole" role
   text content
   text audioUrl
   timestamp(3) createdAt
   text id
}
class interview_questions {
   text optimizationId
   "questiontype" questionType
   text question
   text suggestedAnswer
   text[] tips
   "difficulty" difficulty
   timestamp(3) createdAt
   text id
}
class interview_sessions {
   text userId
   text optimizationId
   "interviewstatus" status
   timestamp(3) startTime
   timestamp(3) endTime
   integer score
   text feedback
   timestamp(3) createdAt
   timestamp(3) updatedAt
   text id
}
class invitation_codes {
   text code
   boolean isUsed
   text usedBy
   timestamp(3) usedAt
   text createdBy
   timestamp(3) createdAt
   timestamp(3) expiresAt
   text id
}
class jobs {
   text userId
   text title
   text company
   text location
   text jobType
   text salaryRange
   text jobDescription
   text requirements
   jsonb parsedRequirements
   text sourceUrl
   timestamp(3) createdAt
   timestamp(3) updatedAt
   text id
}
class messages {
   text conversationId
   text userId
   "messagerole" role
   text content
   jsonb attachments
   jsonb metadata
   timestamp(3) createdAt
   text id
}
class model_configs {
   text name
   text provider
   text apiKey
   text endpoint
   double precision defaultTemperature
   integer defaultMaxTokens
   double precision costPerInputToken
   double precision costPerOutputToken
   integer rateLimitPerMinute
   integer rateLimitPerDay
   boolean isActive
   timestamp(3) createdAt
   timestamp(3) updatedAt
   text id
}
class optimizations {
   text userId
   text resumeId
   text jobId
   jsonb matchScore
   jsonb[] suggestions
   jsonb optimizedContent
   "optimizationstatus" status
   timestamp(3) createdAt
   timestamp(3) completedAt
   text id
}
class performance_metrics {
   text model
   text provider
   integer totalCalls
   integer successfulCalls
   integer failedCalls
   double precision averageLatency
   integer maxLatency
   integer minLatency
   double precision successRate
   double precision failureRate
   timestamp(3) lastUpdated
   text id
}
class prompt_template_versions {
   text templateId
   integer version
   text content
   text[] variables
   text author
   text reason
   boolean isActive
   timestamp(3) createdAt
   text id
}
class prompt_templates {
   text name
   text scenario
   text language
   text template
   text[] variables
   text provider
   boolean isEncrypted
   integer version
   boolean isActive
   timestamp(3) createdAt
   timestamp(3) updatedAt
   text id
}
class resumes {
   text userId
   text title
   text originalFilename
   text fileUrl
   text fileType
   integer fileSize
   jsonb parsedData
   integer version
   boolean isPrimary
   "parsestatus" parseStatus
   text fileMd5
   text extractedText
   text conversationId
   timestamp(3) createdAt
   timestamp(3) updatedAt
   text id
}
class sessions {
   text userId
   timestamp(3) expiresAt
   text token
   text ipAddress
   text userAgent
   timestamp(3) createdAt
   timestamp(3) updatedAt
   text id
}
class storages {
   text userId
   text filename
   text originalName
   integer fileSize
   text mimeType
   text fileUrl
   text filePath
   text hashMd5
   "filetype" fileType
   text category
   text thumbnailUrl
   "osstype" ossType
   boolean isPublic
   timestamp(3) createdAt
   timestamp(3) updatedAt
   text id
}
class system_settings {
   text siteName
   text siteDescription
   boolean maintenanceMode
   boolean allowRegistration
   boolean requireEmailVerification
   boolean requireInviteCode
   integer sessionTimeout
   integer maxLoginAttempts
   integer lockoutDuration
   text smtpHost
   integer smtpPort
   text smtpUser
   text smtpPassword
   text fromEmail
   text fromName
   timestamp(3) createdAt
   timestamp(3) updatedAt
   text id
}
class templates {
   text name
   text category
   text description
   text previewUrl
   boolean isPremium
   boolean isActive
   jsonb configuration
   timestamp(3) createdAt
   timestamp(3) updatedAt
   text id
}
class usage_records {
   text userId
   text model
   text provider
   text scenario
   integer inputTokens
   integer outputTokens
   double precision cost
   integer latency
   boolean success
   text errorCode
   text agentType
   text workflowStep
   timestamp(3) timestamp
   text id
}
class users {
   text email
   text passwordHash
   text username
   text name
   text image
   "role" role
   text phone
   text avatarUrl
   "subscriptiontier" subscriptionTier
   timestamp(3) subscriptionExpiresAt
   timestamp(3) createdAt
   timestamp(3) updatedAt
   timestamp(3) lastLoginAt
   boolean isActive
   boolean emailVerified
   text verificationToken
   text resetPasswordToken
   timestamp(3) resetPasswordExpires
   text stripeCustomerId
   text stripeSubscriptionId
   text paddleCustomerId
   text paddleSubscriptionId
   text subscriptionProvider
   text status
   text avatar
   text id
}
class verification {
   text identifier
   text value
   timestamp(3) expiresAt
   timestamp(3) createdAt
   timestamp(3) updatedAt
   text id
}

accounts  -->  users : userId:id
agent_sessions  -->  users : userId:id
conversations  -->  users : userId:id
generated_pdfs  -->  optimizations : optimizationId:id
generated_pdfs  -->  users : userId:id
interview_messages  -->  interview_sessions : sessionId:id
interview_questions  -->  optimizations : optimizationId:id
interview_sessions  -->  optimizations : optimizationId:id
interview_sessions  -->  users : userId:id
invitation_codes  -->  users : usedBy:id
jobs  -->  users : userId:id
messages  -->  conversations : conversationId:id
messages  -->  users : userId:id
optimizations  -->  jobs : jobId:id
optimizations  -->  resumes : resumeId:id
optimizations  -->  users : userId:id
prompt_template_versions  -->  prompt_templates : templateId:id
resumes  -->  conversations : conversationId:id
resumes  -->  users : userId:id
sessions  -->  users : userId:id
storages  -->  users : userId:id
