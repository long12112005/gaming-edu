CREATE TABLE [questions_qa] (
    [id] uniqueidentifier NOT NULL,
    [room_id] uniqueidentifier NOT NULL,
    [player_id] uniqueidentifier NOT NULL,
    [content] nvarchar(1000) NOT NULL,
    [upvotes] int NOT NULL DEFAULT 0,
    [status] nvarchar(50) NOT NULL DEFAULT N'PENDING',
    [created_at] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
    CONSTRAINT [pk_questions_qa] PRIMARY KEY ([id]),
    CONSTRAINT [fk_questions_qa_rooms_room_id] FOREIGN KEY ([room_id]) REFERENCES [rooms] ([id]) ON DELETE CASCADE,
    CONSTRAINT [fk_questions_qa_room_players_player_id] FOREIGN KEY ([player_id]) REFERENCES [room_players] ([id])
);
