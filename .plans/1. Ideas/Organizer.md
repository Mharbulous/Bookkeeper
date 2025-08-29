# File Organizer Feature Reference Document

## Overview

A visual file organization system for managing uploaded files in Firebase Storage, designed to help users categorize and process documents that require different types of handling.

## Core Concept

A multi-column interface that allows users to visually organize uploaded files into different processing categories through an automated analysis and processing workflow.

## Kanban Board Workflow

```mermaid
flowchart TB
    subgraph Col1 ["📁 Storage 1: Uploads"]
        OnePage["📃One Page PDF"]
        Single["📖Complete Document"]
        Incomplete["📑⚠️Incomplete Document PDF"]
        Bundle["📚3 Bundled Documents"]

    end

    subgraph Col2 ["📂 Storage 2: Split Files"]
        DocA["📖Complete Document"]
        DocC["📑Incomplete PDF"]

    end

    subgraph Col3 ["📄 Storage 3: Pages"]
        SoloPage1["🧩Page 1 of 3"]
        SoloPage2["🧩Page 2 of 3"]
        OnePage_split["🧩Page 4 of 7"]
        PageRaw1["🧩Page 4 of 7"]
        PageRaw2["🧩Page 2 of 3"]
        PageRaw3["🧩Page 3 of 3"]
    end

    subgraph Col4 ["🗄️ Database 2: Merged"]
        MergedDoc["Completed Document<br/>👉 page 1 of 3<br/>👉 page 2 of 3<br/>👉 page 3 of 3"]
    end

    subgraph Col5 ["Column 5: Complete"]

        OnePageComplete["📃One Page PDF"]
        CompleteRaw["📖Doc #1"]
        CompleteSplit["📖Doc #2"]

    end

    subgraph DB1 ["🗄️ Database 1: Best Copy"]
        ChooseBestCopy2{"Choose Best:<br/>👉Page 2 of 3<br/>👉Page 2 of 3"}
        ChooseBestCopy{"Choose Best:<br/>👉Page 4 of 7<br/>👉Page 4 of 7"}
    end

    %% Flow from Column 1

    Single -->|Direct Move| CompleteRaw
    OnePage -->|Direct Move| OnePageComplete


    Bundle -.->|Split| DocA
    Bundle -.->|Split to Pages| OnePage_split
    Bundle -.->|Split| DocC

    %% Flow from Column 2

    DocA -->|Complete| CompleteSplit

    DocC -.->|Split to Pages| SoloPage1
    DocC -.->|Split to Pages| SoloPage2




    %% Flow from Column 1 direct to Column 3
    Incomplete -.->|Split to Pages| PageRaw1
    Incomplete -.->|Split to Pages| PageRaw2
    Incomplete -.->|Split to Pages| PageRaw3

    %% Flow from Column 3 to Column 4 - Duplicate pages
    OnePage_split -->|Duplicate Page| ChooseBestCopy
    PageRaw1 -->|Duplicate Page| ChooseBestCopy
    
    SoloPage2 -->|Duplicate Page| ChooseBestCopy2
    PageRaw2 -->|Duplicate Page| ChooseBestCopy2
    
    %% Flow from Column 3 to Column 4 - Assembling pages into merged document
    SoloPage1 -->|Assemble| MergedDoc
    PageRaw3 -->|Assemble| MergedDoc
    ChooseBestCopy2 -->|Best Copy| MergedDoc


    %% Color Coding by Document Source/Family
    classDef singleDocFamily fill:#e8f5e8,stroke:#4caf50,stroke-width:2px,color:#000000
    classDef bundleDocFamily fill:#e3f2fd,stroke:#2196f3,stroke-width:2px,color:#000000
    classDef incompleteDocFamily fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px,color:#000000
    classDef onePageDocFamily fill:#fff3e0,stroke:#ff9800,stroke-width:2px,color:#000000
    classDef duplicateNode fill:#ffebee,stroke:#f44336,stroke-width:2px,color:#000000

    %% Single Complete Document Family (Light Green)
    class Single,CompleteRaw singleDocFamily

    %% Bundle Document Family (Light Blue)
    class Bundle,DocA,OnePage_split,DocC,SoloPage1,SoloPage2,CompleteSplit bundleDocFamily

    %% Incomplete Document Family (Light Purple)
    class Incomplete,PageRaw1,PageRaw2,PageRaw3 incompleteDocFamily

    %% One Page Document Family (Light Orange)
    class OnePage,OnePageComplete onePageDocFamily

```
