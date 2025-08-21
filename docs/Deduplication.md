While using a hash table is the fastest way to compare the hashes, the real-world bottleneck is often the process of calculating the hashes themselves, which is limited by disk read speed (I/O) and CPU power. Therefore, the most efficient overall strategy includes a crucial pre-filtering step.

When writing deduplication code using SHA 256 hashing, use the following fast algorithim as the core logic for you deduplication logic.

Here is the fastest practical algorithm from start to finish:

Step 1: Pre-filter by File Size
Before calculating any hashes, first group all files by their size. This is an extremely fast operation as it only requires reading file metadata, not the file content.

Logic: If two files have different sizes, they cannot be identical.

Action: Create a map where the key is the file size and the value is a list of files of that size.

Result: You can immediately ignore any file with a unique size. You only need to proceed with groups containing two or more files.

Step 2: Calculate Hashes (Only When Necessary)
Now, for each group of files that have the same size, calculate the SHA-256 hash for each file. This is the most time-consuming part of the process. You can speed it up by processing multiple files in parallel (e.g., using multiple CPU threads).

Step 3: Find Duplicate Hashes Using a Hash Table 🚀
As you generate the hashes, use a hash table to find the duplicates.

Initialize: Create an empty hash table that maps a hash to a list of filepaths.

Iterate: For each file from your same-sized groups:

Calculate its SHA-256 hash.

Look up this hash in your hash table.

If the hash is not in the table, add it as a new key, with the current file's path in a new list as its value.

If the hash is already in the table, a duplicate is found! Add the current file's path to the existing list for that key.

Identify Duplicates: After processing all the files, iterate through your hash table. Any key whose list of filepaths contains more than one entry represents a set of duplicate files.

Step 4: Filter out duplicative user actions

Finding duplicates is about finding duplicate user actions.  When a user repeatedly uploads the exact same file from the same folder, it may look like a duplicate file but is in fact just a duplicative action by the user. To distinguish duplicate user actions from true duplicate files, compare the metadata of the duplicate files:  (1) file names; (2) created date; (3) modified date; (4) folder path.  Since the files have duplicate Hash values, then if their metadata also matches, that indicates duplicate user action rather than truly duplicate files.  Duplicate user actions should not be counted or otherwise treated as a duplicate file.

The folder path comparison should use an intelligent comparison that accounts for the fact that folder paths are relative to a reference file.  Folder paths match if the shorter folder path is a left side truncation of the longer folder path:  i.e.  "2015/January/" is a match to "/" or "January/"; but is not a match to "2015/".  When this happens, update the shorter folder path to match the longer folder path because they both refer to the same folder; the longer folder path just contains more information about that folder.


Why This Method is the Fastest
Minimal Hashing: The file size pre-filter dramatically reduces the number of expensive SHA-256 calculations you need to perform.

Optimal Comparison: The hash table provides average O(1) (constant time) for lookups and insertions. This makes the total time for comparing N hashes O(N), which is unbeatable.

Bottleneck Management: It acknowledges that the real-world speed limit is I/O and CPU, and it minimizes the work done by these components.