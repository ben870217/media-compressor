package main

import (
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
)

const appPath = "/media-compressor/"

func main() {
	executable, err := os.Executable()
	if err != nil {
		log.Fatalf("找不到啟動器位置：%v", err)
	}
	webRoot := filepath.Join(filepath.Dir(executable), "www")
	if _, err := os.Stat(filepath.Join(webRoot, "index.html")); err != nil {
		log.Fatalf("找不到離線網站檔案；請保持 www 資料夾與啟動器放在同一位置。")
	}

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		log.Fatalf("無法建立本機服務：%v", err)
	}
	defer listener.Close()
	url := fmt.Sprintf("http://%s%s", listener.Addr().String(), appPath)

	mux := http.NewServeMux()
	mux.Handle(appPath, staticApp(webRoot))
	server := &http.Server{Handler: mux}
	go func() {
		if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
			log.Printf("本機服務意外停止：%v", err)
		}
	}()

	if err := openChrome(url); err != nil {
		log.Fatalf("找不到 Google Chrome。請安裝 Chrome 後再試一次：%v", err)
	}
	fmt.Println("MediaCompressor 已在 Chrome 開啟。使用完畢請關閉此視窗以停止本機服務。")
	fmt.Println(url)
	select {}
}

func staticApp(root string) http.Handler {
	fileServer := http.FileServer(http.Dir(root))
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		path := request.URL.Path[len(appPath):]
		if path == "" { path = "index.html" }
		if _, err := fs.Stat(os.DirFS(root), path); err != nil {
			request.URL.Path = "/index.html"
		} else {
			request.URL.Path = "/" + path
		}
		fileServer.ServeHTTP(writer, request)
	})
}

func openChrome(url string) error {
	candidates := []string{
		filepath.Join(os.Getenv("ProgramFiles"), "Google", "Chrome", "Application", "chrome.exe"),
		filepath.Join(os.Getenv("ProgramFiles(x86)"), "Google", "Chrome", "Application", "chrome.exe"),
		filepath.Join(os.Getenv("LOCALAPPDATA"), "Google", "Chrome", "Application", "chrome.exe"),
	}
	for _, chrome := range candidates {
		if _, err := os.Stat(chrome); err == nil {
			return exec.Command(chrome, url).Start()
		}
	}
	return fmt.Errorf("Chrome executable was not found")
}
