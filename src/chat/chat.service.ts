import { Document } from '@langchain/core/documents';
import { RunnableSequence } from '@langchain/core/runnables';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import { CharacterTextSplitter } from '@langchain/textsplitters';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as fs from 'fs';
import { Model } from 'mongoose';
import * as path from 'path';
import * as pdfParse from 'pdf-parse';
import { Chat } from './chat.schema';

@Injectable()
export class ChatService implements OnModuleInit {
  constructor(@InjectModel(Chat.name) private chatModel: Model<Chat>) {}

  async onModuleInit() {
    // await this.getAnswerFromVectorStore(
    //   'how to customize the view directory ',
    // ).catch((err) => console.error('Error processing PDFs:', err));
    // await this.savePdfToVactorDb().catch((err) =>
    //   console.error('Error processing PDFs:', err),
    // );
  }

  private readonly pdfFolderPath = 'pdf';

  async processAllPdfFiles(file: Express.Multer.File) {
    // if (!fs.existsSync(this.pdfFolderPath)) {
    //   console.warn(`PDF folder does not exist: ${this.pdfFolderPath}`);
    //   return;
    // }
    // const files = fs.readdirSync(this.pdfFolderPath);
    // for (const file of files) {
    //   const filePath = path.join(this.pdfFolderPath, file);
    //   if (path.extname(file) === '.pdf') {
    //     const dataBuffer = fs.readFileSync(filePath);
    //     const data = await pdfParse(dataBuffer);
    //     await this.chatModel.create({
    //       fileName: file,
    //       textContent: data.text,
    //     });
    //     console.log(`Processed and saved: ${file}`);
    //   }
    // }

    const data = await pdfParse(file.buffer);
    await this.chatModel.create({
      filename: file.originalname,
      textContent: data.text,
    });

    await this.savePdfToVactorDb();
    await this.chatModel.deleteMany({});
    return { message: 'pdf record is save in db ' };
  }

  async savePdfToVactorDb() {
    const pdfDocs = await this.chatModel.find();
    const fullText = pdfDocs.map((doc) => doc.textContent).join('\n');

    const splitter = new CharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 100,
    });

    const chunks = await splitter.splitText(fullText);

    const docs = chunks.map(
      (chunk: string) =>
        new Document({
          pageContent: chunk,
          metadata: {},
        }),
    );

    const embeddings = new OpenAIEmbeddings({
      apiKey:
        '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',
    });

    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        url: 'http://localhost:6333/',
        collectionName: 'pdf-doc',
      },
    );

    const data = await vectorStore.addDocuments(docs);
    console.log('daatatatatatatat', data);
    console.log('Vector store created successfully');
    return { message: 'Vector store created successfully' };
  }

  async getAnswerFromVectorStore(userQuery: string) {
    const embeddings = new OpenAIEmbeddings({
      apiKey:
        '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',
    });

    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        url: 'http://localhost:6333/',
        collectionName: 'pdf-doc',
      },
    );

    const retriever = vectorStore.asRetriever({ k: 2 });
    const llm = new ChatOpenAI({
      apiKey:
        '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',
      model: 'gpt-4o',
      temperature: 0,
    });

    const systemPrompt = `You are a helpful AI assistant. Use the provided context to answer the user's question. If the answer is not in the context, say you are not sure and you should not give any information about that query make sure not to provide any information that is not in context  .`;

    const chain = RunnableSequence.from([
      async (input: { query: string }) => {
        const docs = await retriever.invoke(input.query);
        return {
          ...input,
          context: docs.map((d: any) => d.pageContent).join('\n'),
        };
      },
      async (input: { query: string; context: string }) => {
        const response = await llm.invoke([
          {
            role: 'system',
            content: `${systemPrompt}\n\nContext:\n${input.context}`,
          },
          { role: 'user', content: input.query },
        ]);
        return response;
      },
    ]);

    const result = await chain.invoke({ query: userQuery });
    console.log('Result of query:', result.content ?? result);
    return { data: result.content ?? result };
  }

  // async getAnswerFromVectorStore(userId: string, userQuery: string) {
  //   const embeddings = new OpenAIEmbeddings({
  //     apiKey:
  //       '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',
  //   });

  //   const vectorStore = await QdrantVectorStore.fromExistingCollection(
  //     embeddings,
  //     {
  //       url: 'http://localhost:6333/',
  //       collectionName: 'pdf-doc',
  //     },
  //   );

  //   const retriever = vectorStore.asRetriever({ k: 2 });

  //   const llm = new ChatOpenAI({
  //     apiKey:
  //       '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',
  //     model: 'gpt-4o',
  //     temperature: 0,
  //   });

  //   // Get or create per-user memory
  //   let memory = this.chatHistories.get(userId);
  //   if (!memory) {
  //     memory = new ChatMessageHistory();
  //     this.chatHistories.set(userId, memory);
  //   }

  //   const chain = ConversationalRetrievalQAChain.fromLLM(llm, retriever, {
  //     memory,
  //     returnSourceDocuments: false,
  //     verbose: true,
  //   });

  //   const response = await chain.call({
  //     question: userQuery,
  //   });

  //   return response?.text;
  // }
}
