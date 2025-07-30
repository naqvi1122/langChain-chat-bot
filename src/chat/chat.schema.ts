import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Chat extends Document {
  @Prop({ required: false })
  fileName: string;

  @Prop({ required: false })
  textContent: string;
}

export const ChatSchema = SchemaFactory.createForClass(Chat);





