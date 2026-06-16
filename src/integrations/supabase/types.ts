export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      playlists: {
        Row: {
          cover_emoji: string | null
          created_at: string | null
          id: string
          title: string
          user_id: string
        }
        Insert: {
          cover_emoji?: string | null
          created_at?: string | null
          id?: string
          title: string
          user_id: string
        }
        Update: {
          cover_emoji?: string | null
          created_at?: string | null
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      playlist_items: {
        Row: {
          audio_id: string
          created_at: string | null
          id: string
          playlist_id: string
        }
        Insert: {
          audio_id: string
          created_at?: string | null
          id?: string
          playlist_id: string
        }
        Update: {
          audio_id?: string
          created_at?: string | null
          id?: string
          playlist_id?: string
        }
        Relationships: []
      }
      audio_comments: {
        Row: {
          audio_id: string
          author_avatar: string | null
          author_name: string
          body: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          audio_id: string
          author_avatar?: string | null
          author_name: string
          body: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          audio_id?: string
          author_avatar?: string | null
          author_name?: string
          body?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      audio_likes: {
        Row: {
          audio_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          audio_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          audio_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      audio_saves: {
        Row: {
          audio_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          audio_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          audio_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      audios: {
        Row: {
          allow_immersive_effects: boolean | null
          allow_voice_change: boolean | null
          audio_url: string
          category: string
          comments: number | null
          created_at: string | null
          creator_avatar: string | null
          creator_name: string
          description: string | null
          duration: number | null
          id: string
          likes: number | null
          shares: number | null
          source_text: string | null
          tags: string[] | null
          title: string
          transcript: Json | null
          translations: Json | null
          tts_voice: string | null
          user_id: string
          verse: string | null
          visual_effect: string | null
        }
        Insert: {
          allow_immersive_effects?: boolean | null
          allow_voice_change?: boolean | null
          audio_url: string
          category?: string
          comments?: number | null
          created_at?: string | null
          creator_avatar?: string | null
          creator_name: string
          description?: string | null
          duration?: number | null
          id?: string
          likes?: number | null
          shares?: number | null
          source_text?: string | null
          tags?: string[] | null
          title: string
          transcript?: Json | null
          translations?: Json | null
          tts_voice?: string | null
          user_id: string
          verse?: string | null
          visual_effect?: string | null
        }
        Update: {
          allow_immersive_effects?: boolean | null
          allow_voice_change?: boolean | null
          audio_url?: string
          category?: string
          comments?: number | null
          created_at?: string | null
          creator_avatar?: string | null
          creator_name?: string
          description?: string | null
          duration?: number | null
          id?: string
          likes?: number | null
          shares?: number | null
          source_text?: string | null
          tags?: string[] | null
          title?: string
          transcript?: Json | null
          translations?: Json | null
          tts_voice?: string | null
          user_id?: string
          verse?: string | null
          visual_effect?: string | null
        }
        Relationships: []
      }
      tts_cache: {
        Row: {
          audio_url: string
          created_at: string
          duration: number | null
          id: string
          text: string
          text_hash: string
          transcript: Json | null
          user_id: string | null
          voice: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          duration?: number | null
          id?: string
          text: string
          text_hash: string
          transcript?: Json | null
          user_id?: string | null
          voice: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          duration?: number | null
          id?: string
          text?: string
          text_hash?: string
          transcript?: Json | null
          user_id?: string | null
          voice?: string
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string | null
          followed_id: string
          follower_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          followed_id: string
          follower_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          followed_id?: string
          follower_id?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
