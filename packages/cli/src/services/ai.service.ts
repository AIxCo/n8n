import { GlobalConfig } from "@n8n/config"
import { Service } from "@n8n/di"
import { AiAssistantClient } from "@n8n_io/ai-assistant-sdk"
import { assert, IUser, type } from "n8n-workflow"

import { N8N_VERSION } from "../constants"
import { License } from "../license"

import type {
	AiApplySuggestionRequestDto,
	AiAskRequestDto,
	AiChatRequestDto,
} from '@n8n/api-types';
@Service()
export class AiService {
	private client: AiAssistantClient | undefined;

	constructor(
		private readonly licenseService: License,
		private readonly globalConfig: GlobalConfig,
	) {}

	async init() {
		const aiAssistantEnabled = this.licenseService.isAiAssistantEnabled();

		if (!aiAssistantEnabled) {
			return;
		}

		const licenseCert = await this.licenseService.loadCertStr();
		const consumerId = this.licenseService.getConsumerId();
		const baseUrl = this.globalConfig.aiAssistant.baseUrl;
		const logLevel = this.globalConfig.logging.level;

		this.client = new AiAssistantClient({
			licenseCert,
			consumerId,
			n8nVersion: N8N_VERSION,
			baseUrl,
			logLevel,
		});
	}

	async chat(payload: AiChatRequestDto, user: IUser) {
		if (!this.client) {
			await this.init();
		}
		assert(this.client, 'Assistant client not setup');

		return await this.client.chat(payload, { id: user.id });
	}

	async applySuggestion(payload: AiApplySuggestionRequestDto, user: IUser) {
		if (!this.client) {
			await this.init();
		}
		assert(this.client, 'Assistant client not setup');

		return await this.client.applySuggestion(payload, { id: user.id });
	}

	async askAi(payload: AiAskRequestDto, user: IUser) {
		if (!this.client) {
			await this.init();
		}
		assert(this.client, 'Assistant client not setup');

		return await this.client.askAi(payload, { id: user.id });
	}

	async createFreeAiCredits(user: IUser) {
		if (!this.client) {
			await this.init();
		}
		assert(this.client, 'Assistant client not setup');

		return await this.client.generateAiCreditsCredentials(user);
	}
}


// import { GlobalConfig } from "@n8n/config"
// import { Service } from "@n8n/di"
// import { assert, IUser, type } from "n8n-workflow"
// import OpenAI from "openai"

// import { N8N_VERSION } from "../constants"
// import { License } from "../license"

// // import { AiAssistantClient } from "@n8n_io/ai-assistant-sdk"
// import type {
// 	AiApplySuggestionRequestDto,
// 	AiAskRequestDto,
// 	AiChatRequestDto,
// } from '@n8n/api-types';

// export interface AiErrorHelperRequestPayload {
//   payload: {
//     role: string;
//     type: string;
//     user: {
//       firstName: string;
//     };
//     error: {
//       message: string;
//       lineNumber: number;
//       description: string;
//     };
//     node: {
//       parameters: {
//         mode: string;
//         language: string;
//         jsCode: string;
//         notice: string;
//       };
//       type: string;
//       typeVersion: number;
//       id: string;
//       name: string;
//     };
//     executionSchema: Array<{
//       nodeName: string;
//       schema: {
//         type: string;
//         value: Array<{
//           key?: string;
//           type?: string;
//           value?: string;
//           path?: string;
//         }> | [];
//         path: string;
//       };
//     }>;
//   };
// }

// @Service()
// export class AiService {
// 	private client: OpenAI | undefined;

// 	constructor(
// 		private readonly licenseService: License,
// 		private readonly globalConfig: GlobalConfig,
// 	) {}

// 	async init() {
// 		// Initialize OpenRouter client
// 		this.client = new OpenAI({
// 			apiKey: process.env.OPENROUTER_API_KEY,
// 			baseURL: "https://openrouter.ai/api/v1",
// 		});
// 	}

// 	async chat(payload: AiChatRequestDto, user: IUser) {
// 		if (!this.client) {
// 			await this.init();
// 		}
// 		assert(this.client, 'OpenRouter client not setup');

// 		try {
// 			// Handle init-support-chat type
// 			if (payload.payload.type === 'init-support-chat') {
// 				// Create a more detailed analysis of the workflow execution
// 				const executionData = payload.payload.context?.executionData;
// 				const errorInfo = executionData?.error;

// 				let workflowAnalysis = '';
// 				if (executionData?.runData) {
// 					const nodeExecutions = Object.entries(executionData.runData)
// 						.map(([nodeName, runs]) => {
// 							const run = runs[0]; // Get first run
// 							return `- ${nodeName}: ${run.executionStatus} (took ${run.executionTime}ms)`;
// 						})
// 						.join('\n');
// 					workflowAnalysis = `Workflow execution summary:\n${nodeExecutions}`;
// 				}

// 				let errorAnalysis = '';
// 				if (errorInfo) {
// 					errorAnalysis = `
// Current error:
// - Node: ${errorInfo.node.name}
// - Error: ${errorInfo.description}
// - Message: ${errorInfo.message}
// - Code: ${errorInfo.node.parameters.jsCode}
// `;
// 				}

// 				const systemMessage = `You are a helpful AI assistant for n8n workflows. The user ${payload.payload.user.firstName} is currently in the ${payload.payload.context?.currentView?.name || 'n8n editor'}.
// ${payload.payload.context?.currentView?.description || ''}

// ${workflowAnalysis}

// ${errorAnalysis}

// Please provide specific, actionable assistance based on this context. If there's an error, focus on helping resolve it.`;

// 				const response = await this.client.chat.completions.create({
// 					model: "openrouter/auto",
// 					temperature: 0.7,
// 					frequency_penalty: 0.2,
// 					presence_penalty: 0.7,
// 					max_tokens: 2000,
// 					messages: [
// 						{
// 							role: "system",
// 							content: systemMessage
// 						},
// 						{
// 							role: "user",
// 							content: payload.payload.question || "How can I help you with your workflow?"
// 						},
// 					],
// 				});

// 				// Create a ReadableStream from the response
// 				const stream = new ReadableStream({
// 					start(controller) {
// 						controller.enqueue(JSON.stringify({
// 							text: response.choices[0]?.message?.content || "",
// 							sessionId: payload.sessionId,
// 						}));
// 						controller.close();
// 					}
// 				});

// 				return {
// 					body: stream,
// 				};
// 			}

// 			// Handle regular chat messages
// 			const response = await this.client.chat.completions.create({
// 				model: "openrouter/auto",
// 				temperature: 0.7,
// 				frequency_penalty: 0.2,
// 				presence_penalty: 0.7,
// 				max_tokens: 2000,
// 				messages: [
// 					{
// 						role: "system",
// 						content: "You are a helpful AI assistant for n8n workflows."
// 					},
// 					{
// 						role: "user",
// 						content: payload.payload.text || payload.payload.question || ""
// 					},
// 				],
// 			});

// 			// Create a ReadableStream from the response
// 			const stream = new ReadableStream({
// 				start(controller) {
// 					controller.enqueue(JSON.stringify({
// 						text: response.choices[0]?.message?.content || "",
// 						sessionId: payload.sessionId,
// 					}));
// 					controller.close();
// 				}
// 			});

// 			return {
// 				body: stream,
// 			};
// 		} catch (error) {
// 			throw new Error(`Chat completion failed: ${error.message}`);
// 		}
// 	}

// 	async applySuggestion(payload: AiApplySuggestionRequestDto, user: IUser) {
// 		if (!this.client) {
// 			await this.init();
// 		}
// 		assert(this.client, 'OpenRouter client not setup');

// 		// Implement suggestion application logic here
// 		throw new Error('Not implemented');
// 	}

// 	async askAi(payload: AiAskRequestDto, user: IUser) {
// 		if (!this.client) {
// 			await this.init();
// 		}
// 		assert(this.client, 'OpenRouter client not setup');

// 		try {
// 			const response = await this.client.chat.completions.create({
// 				model: "openrouter/auto",
// 				temperature: 0.7,
// 				frequency_penalty: 0.2,
// 				presence_penalty: 0.7,
// 				max_tokens: 2000,
// 				messages: [
// 					{
// 						role: "system",
// 						content: "You are a helpful AI assistant for n8n workflows."
// 					},
// 					{
// 						role: "user",
// 						content: payload.question
// 					},
// 				],
// 			});

// 			return {
// 				answer: response.choices[0]?.message?.content || "",
// 			};
// 		} catch (error) {
// 			throw new Error(`AI query failed: ${error.message}`);
// 		}
// 	}

// 	async createFreeAiCredits(user: IUser) {
// 		// This method might not be needed with OpenRouter
// 		throw new Error('Not implemented with OpenRouter');
// 	}
// }
