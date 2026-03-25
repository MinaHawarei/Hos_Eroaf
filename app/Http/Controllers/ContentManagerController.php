<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Inertia\Inertia;

class ContentManagerController extends Controller
{
    protected $basePath;

    public function __construct()
    {
        $this->basePath = base_path('storage/content');
    }

    public function index()
    {
        return Inertia::render('ContentManager', [
            'files' => $this->getFileList()
        ]);
    }

    public function show($category, $filename)
    {
        $path = $this->basePath . DIRECTORY_SEPARATOR . $category . DIRECTORY_SEPARATOR . $filename;

        if (!File::exists($path)) {
            abort(404, "File not found: " . $filename);
        }

        $jsonStr = File::get($path);
        $content = json_decode($jsonStr, true);

        return Inertia::render('ContentManager', [
            'editing' => [
                'category' => $category,
                'filename' => $filename,
                'content'  => $content,
            ],
            'files' => $this->getFileList()
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'category' => 'required|string|in:liturgy,readings,lectionary,lyrics,hymns',
            'filename' => ['required', 'string'],
            'content'  => 'required|array',
        ]);

        $category = $request->input('category');
        $filename = $request->input('filename');
        $content  = $request->input('content');

        if (!str_ends_with($filename, '.json')) {
            $filename .= '.json';
        }

        $dir  = $this->basePath . DIRECTORY_SEPARATOR . $category;
        $path = $dir . DIRECTORY_SEPARATOR . $filename;

        if (!File::exists($dir)) {
            File::makeDirectory($dir, 0755, true);
        }

        if (File::exists($path)) {
            return back()->withErrors(['filename' => 'A file with this name already exists.']);
        }

        File::put($path, json_encode($content, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        return redirect()->route('content.show', ['category' => $category, 'filename' => $filename])
            ->with('success', 'File created successfully');
    }

    public function update(Request $request)
    {
        $request->validate([
            'category' => 'required|string',
            'filename' => 'required|string',
            'content'  => 'required|array',
        ]);

        $category = $request->input('category');
        $filename = $request->input('filename');
        $content  = $request->input('content');

        $dir = $this->basePath . DIRECTORY_SEPARATOR . $category;
        if (!File::exists($dir)) {
            File::makeDirectory($dir, 0755, true);
        }

        $path = $dir . DIRECTORY_SEPARATOR . $filename;
        File::put($path, json_encode($content, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        return back()->with('success', 'File saved successfully');
    }

    public function destroy(Request $request)
    {
        $request->validate([
            'category' => 'required|string',
            'filename' => 'required|string',
        ]);

        $path = $this->basePath
            . DIRECTORY_SEPARATOR . $request->input('category')
            . DIRECTORY_SEPARATOR . $request->input('filename');

        if (File::exists($path)) {
            File::delete($path);
        }

        return redirect()->route('content.index')->with('success', 'File deleted successfully');
    }

    private function getFileList()
    {
        $categories = ['liturgy', 'readings', 'lectionary', 'lyrics', 'hymns'];
        $files      = [];

        foreach ($categories as $cat) {
            $dir = $this->basePath . DIRECTORY_SEPARATOR . $cat;
            if (File::exists($dir)) {
                $files[$cat] = collect(File::files($dir))
                    ->map(fn($f) => $f->getFilename())
                    ->sort()
                    ->values();
            } else {
                $files[$cat] = collect();
            }
        }

        return $files;
    }
}
