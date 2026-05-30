# Project Proposal

---

**AI Control in Web GUIs for Ambiguous Instructions: Numbered Candidate Overlays for Natural Language Interface Manipulation**

**Team: HAI Five**

**Jaehyeon Kang          Junhyeok Yang          Danilo Arsenio**         

 **Yujung Jang**

 

**1\. Introduction**

This project is in the topic space of Human-AI Interaction, natural-language interfaces, multimodal interaction, and GUI control. We focus on situations where a user wants to control a graphical interface through natural language. Users often give commands such as “play that video,” “open the blue icon,” “not that one, the one above,” or “a little to the right.” These commands are natural for humans, but difficult for AI systems because the target object is ambiguous. The AI may not know what “that,” “the blue one,” or “the one above” refers to. The user challenge is that direct AI execution can easily lead to wrong actions, while too many clarification questions can make the interaction slow. Our project explores a simple interaction method: when the AI is uncertain, it shows numbered overlays on possible GUI targets. The user can then choose a number, click a target, or give a follow-up correction. Although this idea was inspired by a connected-screen project, this Human-AI Interaction project will be implemented as a browser-based prototype. The prototype will simulate a media/home-screen web GUI, so the project can be completed and evaluated within the course.

 

**2\. Related Work**

Prior work on multimodal interaction, such as **“Put-that-there”** and **QuickSet**, showed that speech combined with pointing or gesture can help users refer to objects more naturally. Our project follows this idea, but applies it to AI-assisted web GUI control. Natural-language interface systems such as **DataTone** and **Eviza** studied ambiguity in user commands and used clarification or disambiguation interfaces. Our project similarly treats ambiguity as something the interface should expose and resolve, rather than hide. Accessibility tools such as **Microsoft Voice Access** and **Google Android Voice Access** use numbered overlays to let users select screen elements by voice. Our approach is related, but different: instead of numbering every item on screen, the AI first selects likely candidates based on the user’s command. Recent GUI-agent work such as **Mind2Web**, **WebVoyager**, and **SeeAct** studies how AI agents can understand and manipulate web interfaces. These systems show that grounding natural-language instructions to the correct GUI element is still difficult. Our project focuses on a human-in-the-loop solution: the AI suggests candidates, and the human confirms or repairs the selection.

 

**3\. Final Target**

Our final system will be a web-based prototype of a media/home-screen GUI. The interface will include cards such as **Continue Watching**, **Apps**, **Modes**, **Search**, **Help**, and **Settings**. The system will support the following interaction:

**1\.**     The user enters a natural-language command.   
**2\.**     The system parses the command.   
**3\.**     The system finds possible GUI targets.   
**4\.**     The system displays numbered overlays on candidate targets.   
**5\.**     The user selects or corrects the target.   
**6\.**     The system previews or executes the action. 

**7\.**     The system provides undo or repair when needed.

The study goal is to understand whether numbered candidate overlays help users control GUIs through ambiguous natural-language commands. We will evaluate whether this method improves target selection, perceived control, and user trust compared with simpler baselines.

 

**4\. Approach**

The system pipeline will be:

User command → intent parsing → UI element registry → candidate ranking → numbered overlay → user selection or repair → action preview/execution → undo → logging

The prototype will use a predefined UI element registry. Each GUI element will have information such as ID, label, semantic tags, location, and possible actions. For example, a “Cooking Video” card may have tags such as video, cooking, and recent.

Example interaction:

**User:** “Play the cooking video.”  
**System:** Shows numbered candidates:

1. Cooking video   
2. Cooking mode   
3. Recipe page  
   **User:** “1.”  
   **System:** Plays the selected video and shows an undo option. 

Another example:

**User:** “Open the blue icon.”  
**System:** Shows several blue candidates.  
**User:** “No, the one above.”  
**System:** updates the selected target and asks for confirmation.

For the user study, we plan to recruit approximately **\# of participants**. Participants will perform simple GUI-control tasks under different conditions:

* Manual clicking/searching  
* Text-only AI command   
* Numbered candidate overlay   
* Numbered overlay with repair and undo 

We will measure task success, wrong selection rate, completion time, number of repair turns, perceived control, trust, workload, and qualitative feedback.

 

**5\. Milestones(TBD…)**

| Date | Milestone | Expected Output |
| ----- | ----- | ----- |
| **Apr 21** | Initial proposal | Submit project proposal |
| **Apr 28** | Feedback revision | Revise project scope and study plan |
| **May 5** | Low-fidelity prototype | Static web GUI and element registry |
| **May 12** | Core prototype | Parser, ranking, numbered overlay |
| **May 19** | Repair and undo | Follow-up commands, confirmation, undo |
| **May 23** | Pilot study | Test with 1–2 users |
| **May 26–30** | Main study | Run \# of participant study |
| **Jun 2** | Analysis | Summarize logs, survey, and interview data |
| **Jun 9/11** | Final presentation | Demo, report, and presentation |

**6\. Specialties and Roles**

| Member | Specialty and Role |
| ----- | ----- |
| **Junhyeok Yang** |  |
| **Danilo Arsenio** |  |
| **Jaehyeon Kang** | Project ideation, HAI literature review, user study design, HAI interaction design, AI Dev. |
| **Yujung Jang** |  |

**7\. Expected Challenges**

One challenge is that natural language commands can be too ambiguous. If users use vague expressions such as "that," "the blue one," or "the one on top," the system may fail to accurately identify the intended target. We must build instruction data that the system can properly understand. Another challenge is candidate ranking. The system may display incorrect candidates. To handle this, we will utilize semantic tags, displayable labels, and element location information. The third challenge is balancing speed and confirmation procedures. If the system requests confirmation too frequently, it can slow down, while executing too quickly can lead to a loss of user trust. We intend to use simple rules based on risk. Low-risk tasks will be executed with an undo option, while high-risk tasks will require confirmation.

**8\. Project Success Definition**

**Worst case:**  
We complete a simple browser prototype with static GUI cards and numbered overlays. We run a small pilot and report design insights.

**Average case:**  
We complete a working prototype with command parsing, candidate ranking, numbered overlays, repair commands, undo, and logging. We run a user study with 8–12 participants and report preliminary findings.

**Best case:**  
We complete a polished prototype and run a study with 12–16 participants. We find preliminary evidence that numbered overlays with repair and undo reduce wrong selections and improve perceived control compared with text-only AI commands.

 

**9\. LLM Usage**

This proposal was prepared with the assistance of ChatGPT for background writing, synthesis of relevant research, and final revisions.

Roles  
Front-end Development  
Web AI(vision)?  
LLM for Voice control(with parsing)  
Dataset 

- (Well-structured user instructions, like actual use cases that aren't too vague.)  
- web content? 

Project Experience & Development Tools/Frames

Feedback  
stylette? (Tae Soo Kim) \< similar \- changing the style  
vs) real time? real-experience  
why natural language? limited movement  
evaluation? measurement? aspect of experiment \>\> 

1\) candidate (vs) Ai choice  
satisfaction / accuracy / time?

Add personalize

check candidate \> show review

Search similar paper  
Deadline: 4/28

\<Other team’s feedback\>  
performance of AI’s access permission(into Netflix or Amazon)  
User study \-\> compare people who use remote controller \-\> the number of command / satisfaction rate(reduce hassle things)  
Amazon \- might be better not to use it \< not normal situation(actually)  
limited to OTT(include Youtube) might be better

\<cour next\>  
Novelty problem \<\< controlling the device or web already exists  
(vs) to do natural voice  
technically easy \> use STT and just appliment for exist problem  
\>\> more specific situation  
so general situation  
easy to implement

how about the user who has disability about speachless-can not type keyboard  
\<\< (ex) open the window \- wink twice

\<Kim jihwan\> \<Team KNC\>  
how can we recognize ambitious \> AI can  
user study  
the number of trial \-\> can prove the availability  
reduce ambitious thing \> not to give candidate but repeat the question  
in the case that not just the condition is ambitious but instruction is ambitious  
\> can be solved? give intuitive image to choose

	 		 		  
Lecture 7A  
					  
				  
			  
		  
	 

# 0423 feedback

1. Using webcam eyetracker, narrow down candidates based on the area of the screen being looked at.

Similar Works: Voice attack,  
**provided feedback to**  
**cournext**  
**sungdongjin**  
**KNC**  
**kimjihwan**

**received feedback from**  
**cournext**  
**sungdongjin**

**KNC**  
**kimjihwan**

Feedback 1 (Don't know team name)  
It’ll work well when you’re giving the “Press the button” prompt on a web ui. However, a prompt like “Press the 6th slide” would require changing mouse position to an accurate place. This might be a technically difficult vision problem.  
Instead of an agent, maybe if you forgo the HTML and used an UI more suited for AI, it would work better?  
Take screenshots, and web agent works by ‘focusing’ on a specific HTML when prompted with “Press button”

케이엔씨 팀 김지환 et al. Feedback:  
Q. 뭐 보고 싶다는 게, 이미 제목을 알고 있지 않나?  
When you say you want to see a show, don’t you already know the title?  
A 제목 없이도 생김새만으로 지시.  
We can give orders without the title, by just describing what it looks like.  
Q. 결과는 어떻게…?  
How do you measure the performance of the result?  
A. 인풋에서 꼬리까지 도달하는 시간, 횟수 측정. 혹은 만족도 survey   
The time taken for the input→tail process. The number of inquiries. Satisfaction survey.  
Q. 애매함 판단은 LLM에게 맡기나?  
Is ‘vagueness’ determined by LLM?  
A. 그렇다. 적으면 바로 수행도 가능할 것  
Yes. Can choose one directly without confirmation if there’s only one selection.  
Q. 유저스터디는 기존의 시스템이랑 성공률 비교, 지시 횟수 비교하면 될 것 같다.  
As for the user study, Should compare success rate and command count with previous systems  
Q. 우리는 웹툰추천.  
We recommend webtoons.   
Q. 후보를 줄일 때, 지시 자체가 애매해서 A를 해야 할지 B 작업을 해야 할지 모르겠을 때. 애매한 걸 한번 더 물어본다는 느낌으로.  
When narrowing down the options, if the instruction is too vague to choose between task A and B, ask again to remove vagueness.  
A. ‘영상 틀어 줘’라고 하면 영상들만 선택지 제공.  
If we say “play the video”, filter to only give options containing videos.

# Related Works

'LLM Gui Agent' has been a rather popular idea. There were several applications that carry out similar tasks, although not exactly using on-screen numbered selections.

**1\. LLM GUI Agents**

Here's a video covering GUI Agent.

[\[SKKU AI Colloquium 2025\] 이선재 교수-GUI Agent: Practical Solutions to automating all digital tasks](https://youtu.be/DBAYZ-fpfTU?si=AfbQOvfIqAvDwmU-)

arXiv:2402.07945  
\[Submitted on 9 Feb 2024\]

# **ScreenAgent: A Vision Language Model-driven Computer Control Agent**

[Runliang Niu](https://arxiv.org/search/cs?searchtype=author&query=Niu,+R), [Jindong Li](https://arxiv.org/search/cs?searchtype=author&query=Li,+J), [Shiqi Wang](https://arxiv.org/search/cs?searchtype=author&query=Wang,+S), [Yali Fu](https://arxiv.org/search/cs?searchtype=author&query=Fu,+Y), [Xiyu Hu](https://arxiv.org/search/cs?searchtype=author&query=Hu,+X), [Xueyuan Leng](https://arxiv.org/search/cs?searchtype=author&query=Leng,+X), [He Kong](https://arxiv.org/search/cs?searchtype=author&query=Kong,+H), [Yi Chang](https://arxiv.org/search/cs?searchtype=author&query=Chang,+Y), [Qi Wang](https://arxiv.org/search/cs?searchtype=author&query=Wang,+Q)  
Existing Large Language Models (LLM) can invoke a variety of tools and APIs to complete complex tasks. The computer, as the most powerful and universal tool, could potentially be controlled directly by a trained LLM agent. Powered by the computer, we can hopefully build a more generalized agent to assist humans in various daily digital works. In this paper, we construct an environment for a Vision Language Model (VLM) agent to interact with a real computer screen. Within this environment, the agent can observe screenshots and manipulate the Graphics User Interface (GUI) by outputting mouse and keyboard actions. We also design an automated control pipeline that includes planning, acting, and reflecting phases, guiding the agent to continuously interact with the environment and complete multi-step tasks. Additionally, we construct the ScreenAgent Dataset, which collects screenshots and action sequences when completing a variety of daily computer tasks. Finally, we trained a model, ScreenAgent, which achieved computer control capabilities comparable to GPT-4V and demonstrated more precise UI positioning capabilities. Our attempts could inspire further research on building a generalist LLM agent.

[https://github.com/niuzaisheng/ScreenAgent](https://github.com/niuzaisheng/ScreenAgent)

A lot more information on GUI Agents can be found in this survey paper.

arXiv:2402.07945  
\[Submitted on 27 Nov 2024 ([v1](https://arxiv.org/abs/2411.18279v1)), last revised 6 May 2025 (this version, v12)\]

# **Large Language Model-Brained GUI Agents: A Survey**

[Chaoyun Zhang](https://arxiv.org/search/cs?searchtype=author&query=Zhang,+C), [Shilin He](https://arxiv.org/search/cs?searchtype=author&query=He,+S), [Jiaxu Qian](https://arxiv.org/search/cs?searchtype=author&query=Qian,+J), [Bowen Li](https://arxiv.org/search/cs?searchtype=author&query=Li,+B), [Liqun Li](https://arxiv.org/search/cs?searchtype=author&query=Li,+L), [Si Qin](https://arxiv.org/search/cs?searchtype=author&query=Qin,+S), [Yu Kang](https://arxiv.org/search/cs?searchtype=author&query=Kang,+Y), [Minghua Ma](https://arxiv.org/search/cs?searchtype=author&query=Ma,+M), [Guyue Liu](https://arxiv.org/search/cs?searchtype=author&query=Liu,+G), [Qingwei Lin](https://arxiv.org/search/cs?searchtype=author&query=Lin,+Q), [Saravan Rajmohan](https://arxiv.org/search/cs?searchtype=author&query=Rajmohan,+S), [Dongmei Zhang](https://arxiv.org/search/cs?searchtype=author&query=Zhang,+D), [Qi Zhang](https://arxiv.org/search/cs?searchtype=author&query=Zhang,+Q)  
GUIs have long been central to human-computer interaction, providing an intuitive and visually-driven way to access and interact with digital systems. The advent of LLMs, particularly multimodal models, has ushered in a new era of GUI automation. They have demonstrated exceptional capabilities in natural language understanding, code generation, and visual processing. This has paved the way for a new generation of LLM-brained GUI agents capable of interpreting complex GUI elements and autonomously executing actions based on natural language instructions. These agents represent a paradigm shift, enabling users to perform intricate, multi-step tasks through simple conversational commands. Their applications span across web navigation, mobile app interactions, and desktop automation, offering a transformative user experience that revolutionizes how individuals interact with software. This emerging field is rapidly advancing, with significant progress in both research and industry.  
To provide a structured understanding of this trend, this paper presents a comprehensive survey of LLM-brained GUI agents, exploring their historical evolution, core components, and advanced techniques. We address research questions such as existing GUI agent frameworks, the collection and utilization of data for training specialized GUI agents, the development of large action models tailored for GUI tasks, and the evaluation metrics and benchmarks necessary to assess their effectiveness. Additionally, we examine emerging applications powered by these agents. Through a detailed analysis, this survey identifies key research gaps and outlines a roadmap for future advancements in the field. By consolidating foundational knowledge and state-of-the-art developments, this work aims to guide both researchers and practitioners in overcoming challenges and unlocking the full potential of LLM-brained GUI agents.

[https://github.com/vyokky/LLM-Brained-GUI-Agents-Survey](https://github.com/vyokky/LLM-Brained-GUI-Agents-Survey)

Vox51 AI Agent Lecture:  
[https://docs.google.com/presentation/d/1yoZmles5Do4y\_-mubmnWYItx7Pe\_3CwHuCQG6Uu11zQ/edit?slide=id.g37484e22284\_0\_74\#slide=id.g37484e22284\_0\_74](https://docs.google.com/presentation/d/1yoZmles5Do4y_-mubmnWYItx7Pe_3CwHuCQG6Uu11zQ/edit?slide=id.g37484e22284_0_74#slide=id.g37484e22284_0_74)

Common problems with trying to make a GUI agent:  
1\. Standard VLM failing at GUI  
— Cannot locate a button exactly  
— Selects wrong elements  
— High resolution of GUI screen → expensive input  
2\. OCR failure  
— Need visual context around the text  
— Irregular text format  
— Text changing and disappearing  
3\. Click failure  
— Need to learn correct place to interact  
4\. GUI Dataset quality  
— No standard format

**2\. Error Correction on LLM-Human Interaction**

There also has been Human-AI interaction research to lower LLM errors.

[**Low-code LLM: Graphical User Interface over Large Language Models**](https://aclanthology.org/2024.naacl-demo.2.pdf)

[Yuzhe Cai](https://aclanthology.org/people/yuzhe-cai/unverified/), [Shaoguang Mao](https://aclanthology.org/people/shaoguang-mao/unverified/), [Wenshan Wu](https://aclanthology.org/people/wenshan-wu/unverified/), [Zehua Wang](https://aclanthology.org/people/zehua-wang/unverified/), [Yaobo Liang](https://aclanthology.org/people/yaobo-liang/unverified/), [Tao Ge](https://aclanthology.org/people/tao-ge/unverified/), [Chenfei Wu](https://aclanthology.org/people/chenfei-wu/), [Wang You](https://aclanthology.org/people/wang-you/unverified/), [Ting Song](https://aclanthology.org/people/ting-song/unverified/), [Yan Xia](https://aclanthology.org/people/yan-xia/), [Nan Duan](https://aclanthology.org/people/nan-duan/unverified/), [Furu Wei](https://aclanthology.org/people/furu-wei/unverified/)

---

##### **Abstract**

Utilizing Large Language Models (LLMs) for complex tasks is challenging, often involving a time-consuming and uncontrollable prompt engineering process. This paper introduces a novel human-LLM interaction framework, Low-code LLM. It incorporates six types of simple low-code visual programming interactions to achieve more controllable and stable responses. Through visual interaction with a graphical user interface, users can incorporate their ideas into the process without writing trivial prompts. The proposed Low-code LLM framework consists of a Planning LLM that designs a structured planning workflow for complex tasks, which can be correspondingly edited and confirmed by users through low-code visual programming operations, and an Executing LLM that generates responses following the user-confirmed workflow. We highlight three advantages of the low-code LLM: user-friendly interaction, controllable generation, and wide applicability. We demonstrate its benefits using four typical applications. By introducing this framework, we aim to bridge the gap between humans and LLMs, enabling more effective and efficient utilization of LLMs for complex tasks. The code, prompts, and experimental details are available at https://github.com/moymix/TaskMatrix/tree/main/LowCodeLLM. A system demonstration video can be found at https://www.youtube.com/watch?v=jb2C1vaeO3E.

This paper seeks to lessen errors using the voice audio in addition to transcript.

## [**Listen Again and Choose the Right Answer: A New Paradigm for Automatic Speech Recognition with Large Language Models**](https://aclanthology.org/2024.findings-acl.37.pdf)

[Yuchen Hu](https://aclanthology.org/people/yuchen-hu/), [Chen Chen](https://aclanthology.org/people/chen-chen/unverified/), [Chengwei Qin](https://aclanthology.org/people/chengwei-qin/), [Qiushi Zhu](https://aclanthology.org/people/qiushi-zhu/unverified/), [Eng Siong Chng](https://aclanthology.org/people/eng-siong-chng/), [Ruizhe Li](https://aclanthology.org/people/ruizhe-li/)

---

##### **Abstract**

Recent advances in large language models (LLMs) have promoted generative error correction (GER) for automatic speech recognition (ASR), which aims to predict the ground-truth transcription from the decoded N-best hypotheses. Thanks to the strong language generation ability of LLMs and rich information in the N-best list, GER shows great effectiveness in enhancing ASR results. However, it still suffers from two limitations: 1\) LLMs are unaware of the source speech during GER, which may lead to results that are grammatically correct but violate the source speech content, 2\) N-best hypotheses usually only vary in a few tokens, making it redundant to send all of them for GER, which could confuse LLM about which tokens to focus on and thus lead to increased miscorrection. In this paper, we propose ClozeGER, a new paradigm for ASR generative error correction. First, we introduce a multimodal LLM (i.e., SpeechGPT) to receive source speech as extra input to improve the fidelity of correction output. Then, we reformat GER as a cloze test with logits calibration to remove the input information redundancy and simplify GER with clear instructions. Experiments show that ClozeGER achieves a new breakthrough over vanilla GER on 9 popular ASR datasets.

**3\. Browser Automation**

**Selenium**  
https://www.selenium.dev/  
**Puppeteer**  
https://pptr.dev/  
**PlayWright**  
https://playwright.dev/

# **Steward: Natural Language Web Automation**

[Brian Tang](https://arxiv.org/search/cs?searchtype=author&query=Tang,+B), [Kang G. Shin](https://arxiv.org/search/cs?searchtype=author&query=Shin,+K+G)  
Recently, large language models (LLMs) have demonstrated exceptional capabilities in serving as the foundation for AI assistants. One emerging application of LLMs, navigating through websites and interacting with UI elements across various web pages, remains somewhat underexplored. We introduce Steward, a novel LLM-powered web automation tool designed to serve as a cost-effective, scalable, end-to-end solution for automating web interactions. Traditional browser automation frameworks like Selenium, Puppeteer, and Playwright are not scalable for extensive web interaction tasks, such as studying recommendation algorithms on platforms like YouTube and Twitter. These frameworks require manual coding of interactions, limiting their utility in large-scale or dynamic contexts. Steward addresses these limitations by integrating LLM capabilities with browser automation, allowing for natural language-driven interaction with websites. Steward operates by receiving natural language instructions and reactively planning and executing a sequence of actions on websites, looping until completion, making it a practical tool for developers and researchers to use. It achieves high efficiency, completing actions in 8.52 to 10.14 seconds at a cost of  
0.028*peractionoranaverageof*  
0.18 per task, which is further reduced to 4.8 seconds and $0.022 through a caching mechanism. It runs tasks on real websites with a 40% completion success rate. We discuss various design and implementation challenges, including state representation, action sequence selection, system responsiveness, detecting task completion, and caching implementation.

Additional Note:  
I had an idea for 'OHSA regulation violation detector'  
Turns out there were also papers implementing this.  
https://armgpublishing.com/journals/ssa/volume-1-issue-1/article-1/  
https://www.sciencedirect.com/science/article/pii/S0957417424026368  
https://iopscience.iop.org/article/10.1088/1757-899X/1099/1/012013/meta  
https://ieeexplore.ieee.org/abstract/document/10258290/

**Stylette (CHI 2022).** Stylette addresses directly in our proposal because it already demonstrates that natural language can be used to manipulate the web through a browser extension. Methodologically, it combines a selected target element, an LLM-style interpretation of the request, and retrieval from a large dataset of web components to generate alternative CSS properties and values; the user study reported a 35% speedup over developer tools for styling tasks. Its limitation, however, is exactly where novelty begins: Stylette assumes the user has already identified and clicked the target, so ambiguity is largely about *how to transform* a known element, not *which element* the user means. Relative to Stylette, contribution is not “NL on the web,” but a **collaborative referential disambiguation protocol** for visible GUI targets under ambiguity. 

First, classic multimodal HCI established that deictic language such as “that,,,” becomes usable when paired with an external referent, beginning with **Put-that-there** and later systems such as **QuickSet**.  
Second, HCI systems such as **DataTone** and **Eviza** showed that ambiguity can be handled with mixed-initiative widgets rather than forcing users to restate everything in a perfectly formal command.   
Third, recent web/GUI agent work such as **Mind2Web**, **SeeAct**, **Set-of-Mark Prompting**, **OmniParser**, and related benchmarks reframed the problem as *grounding* instructions to on-screen elements, but mostly optimized for autonomous agent success rather than collaborative interaction.   
Fourth, recent HAI work on **appropriate reliance** shows that explanation alone can increase reliance even when the model is wrong, which is directly relevant if your agent might click the wrong target. 

**DataTone (UIST 2015).** DataTone is the clearest HCI precedent for your “disambiguation-first” idea. Its main methodological move is to couple algorithmic parsing with interactive ambiguity widgets, then retain user corrections as constraints that affect later turns. The key insight is that ambiguity should be surfaced *at the point where it matters* rather than hidden inside a parser. Relative to DataTone, your novelty is the transfer of this principle from data-query semantics to **web GUI referential grounding**, with numbered candidate overlays and deictic repair over visible screen objects rather than dataset fields and chart specifications.    
**Eviza (UIST 2016).** Eviza extends the same family of ideas into interactive visual analysis, including fuzzy terms such as “large” and “near,” ambiguity widgets, and a dialog over an existing visualization rather than a blank canvas. Methodologically, that matters because it shows ambiguity can be resolved *in context* over what the user is currently viewing. Its limitation for your setting is that the ambiguity is still mostly semantic and analytic, not action-oriented selection among multiple clickable GUI items. Relative to Eviza, your work targets **generic actionable GUIs** and adds safety concerns such as preview/confirmation/undo that matter when the AI can execute actions instead of merely refiltering a chart.  
**Mind2Web (NeurIPS 2023).** Mind2Web is essential technical context because it reframes web interaction as a large-scale grounding and action-selection problem over real websites. Its core lesson is that raw pages are too large for direct reasoning, so candidate filtering is not optional; some form of pruning or ranking is structurally necessary. But Mind2Web evaluates autonomous agents, not collaborative user interaction, so the ranked candidates remain an internal model artifact rather than a first-class user interface element. Your protocol is novel relative to Mind2Web because it asks whether **externalizing candidate ranking to the user** can outperform hidden ranking when the command itself is ambiguous.

**SeeAct (ICML 2024).** SeeAct is especially useful because it demonstrates that with strong reasoning models, **grounding** is still the main bottleneck. The paper’s live-website setting is important: in realistic environments, even capable multimodal models often need auxiliary grounding strategies, and performance jumps under oracle or manual grounding. This is almost a direct motivation for your protocol: when grounding is unreliable, ask the human to resolve the final ambiguity cheaply rather than forcing full autonomy. What is novel in your project is turning the grounding failure point into a **designed interaction loop** instead of treating it only as a model error.

**Set-of-Mark Prompting (arXiv 2023).** Set-of-Mark is the closest technical cousin to your overlay idea, so you should treat it carefully. Its contribution is to overlay explicit marks on images so that large multimodal models can ground text to regions much better than with the raw image alone. The limitation, for your purposes, is that the marks are fundamentally **for the model**, not for the human; the paper does not study whether the marks improve mutual understanding, repair, trust, or control. Your defensible claim is therefore not “we use numbered overlays,” but “we turn overlay marks into a **human-facing conversational state** that supports disambiguation, repair, and safe execution.” 

**OmniParser (arXiv 2024).** OmniParser shows how screenshot-based GUI interaction benefits from converting pixels into structured interactive regions plus local semantics, and the project page explicitly presents parsed screenshots with **bounding boxes and numeric IDs**. That makes it highly relevant as a possible backend for your class project, especially if you later move beyond a fixed element registry. But OmniParser’s evaluated contribution is perceptual and agentic: it helps models act more accurately; it does not test whether numeric IDs help users disambiguate targets collaboratively. Relative to OmniParser, your novelty lies in the **interaction design layer over parsed candidates**, not in the parser itself.  

**Fostering Appropriate Reliance on Large Language Models (CHI 2025).** This is the most relevant recent reliance paper for your safety argument. The method matters: after a think-aloud phase, the authors ran a preregistered controlled experiment with 308 participants and found that explanations increased reliance on both correct and incorrect outputs, while sources and inconsistencies helped reduce reliance on incorrect ones. The implication for your project is important: a polite explanation after a guessed click is not enough; you need interaction structures that preserve user control *before* irreversible action. Relative to this paper, your contribution is to study appropriate reliance in **GUI action execution**, where preview, confirmation, and undo may be more effective than explanation-only interventions.  

# Project Plan

일부 예전 첨부자료는 만료되어 다시 열 수 없지만, 지금까지의 대화 내용과 최신 웹 기준으로 판단하면 다음과 같습니다.

이 아이디어가 **수업 프로젝트를 넘어 CHI/IUI/UIST급 연구**가 되려면, “AI가 상품/영화 리뷰를 요약해준다”가 아니라 **dense result grid에서 여러 후보를 비교할 때 발생하는 인간의 탐색·검증·신뢰 문제를 해결하는 상호작용 기법**으로 재정의해야 합니다.

가장 좋은 논문형 주제는 이쪽입니다.

**GroundedCompare: In-Place AI Evidence Overlays for Multi-Item Decision Making in Dense Web GUIs**

핵심 주장은 다음이 안전합니다.

사용자가 쇼핑·OTT·검색 결과처럼 비슷한 후보가 많이 나열된 화면에서 여러 항목을 비교할 때, AI가 별도 챗창이나 상세 페이지가 아니라 **현재 결과 그리드 위에 item-specific evidence overlay**를 붙여주면, 사용자의 page switching, 정보 매칭 비용, 기억 부담, 잘못된 신뢰를 줄일 수 있는가?

---

## **1\. 1티어 논문으로 만들려면 “기능”이 아니라 “연구 기여”가 있어야 함**

CHI는 논문의 핵심 평가 기준을 **HCI에 대한 original research contribution**이라고 설명합니다. 특히 interface artifact/technique 논문은 실제로 중요한 문제를 설득력 있게 동기화하고, 기존 지식의 한계를 설명하며, 다른 연구자가 재현할 수 있을 정도로 구체적으로 기술하고, rigorous validation을 통해 practical significance를 보여줘야 합니다. ([ACM CHI 2026](https://chi2026.acm.org/contributions-to-chi/?utm_source=chatgpt.com))

IUI도 AI와 HCI의 교차점에서 실제 HCI challenge를 machine intelligence로 다루고, computational 측면과 human-centric 측면을 모두 논의하는 제출을 이상적으로 봅니다. ([IUI](https://iui.acm.org/2026/call-for-papers/?utm_source=chatgpt.com)) UIST는 human-computer interface innovation을 위한 premier forum이므로, 단순 응용보다 **새로운 interaction technique**과 강한 구현 완성도를 요구하는 쪽에 가깝습니다. ([UIST 2026](https://uist.acm.org/?utm_source=chatgpt.com))

따라서 “AI가 리뷰를 요약한다”는 기능 설명으로는 약합니다. 논문급으로는 다음 중 최소 3개가 필요합니다.

1. **명확한 사용자 문제:** 여러 유사 항목을 비교할 때 사용자가 상세 페이지를 반복 왕복하고, 각 항목의 근거를 기억·비교하기 어렵다.  
2. **새로운 상호작용 기법:** 선택된 여러 항목 옆에 AI-generated evidence를 in-place로 붙여 비교하게 한다.  
3. **선행연구 대비 차별성:** 기존 리뷰 요약, 쇼핑 챗봇, 비교표, 번호 overlay와 무엇이 다른지 명확히 한다.  
4. **엄밀한 평가:** baseline 대비 page switches, task time, decision quality, confidence calibration, trust, workload를 비교한다.  
5. **일반화 가능한 지식:** “이런 UI가 좋았다”가 아니라, dense-grid decision support에서 어떤 evidence placement와 repair mechanism이 효과적인지 design implications를 도출한다.

---

## **2\. 가장 중요한 novelty 포인트**

이 분야에는 이미 강한 제품·연구 선행사례가 있습니다.

Amazon은 이미 AI-generated review highlights를 제공합니다. 이 기능은 상품 상세 페이지에서 고객 리뷰의 긍정·중립·부정 의견과 자주 언급된 특징을 요약해 사용자가 제품 적합성을 빠르게 판단하도록 합니다. ([Amazon News](https://www.aboutamazon.com/news/retail/amazon-ai-generated-review-highlights?utm_source=chatgpt.com)) Amazon Rufus도 상품 카탈로그, 리뷰, Q\&A, 웹 정보를 바탕으로 쇼핑 질문에 답하고, 비교와 추천을 제공하는 generative AI shopping assistant입니다. ([Amazon News](https://www.aboutamazon.com/news/retail/amazon-rufus?utm_source=chatgpt.com))

따라서 다음은 novelty가 아닙니다.

* AI 리뷰 요약  
* AI 상품 비교  
* 쇼핑 챗봇  
* 제품 추천  
* 번호 overlay  
* 단일 상품 상세 페이지의 review summary

방어 가능한 novelty는 다음입니다.

**현재 사용자가 보고 있는 결과 그리드에서, 사용자가 자연어·번호·속성으로 지정한 여러 후보에 대해, AI가 각 항목 옆에 근거 기반 요약과 비교 단서를 직접 붙여주는 interaction protocol.**

즉, 핵심은 **AI summary**가 아니라 **spatially grounded, in-place, multi-item evidence presentation**입니다.

---

## **3\. 기존 연구와의 차별화는 이렇게 잡아야 함**

### **Amazon Review Highlights / Rufus와의 차이**

Amazon Review Highlights는 제품 상세 페이지 중심이고, Rufus는 대화형 shopping assistant입니다. 둘 다 강력하지만, 현재 결과 그리드에서 여러 후보를 동시에 비교할 때 **각 요약이 어떤 카드에 대응되는지**, 사용자가 **화면을 떠나지 않고 비교할 수 있는지**, AI 근거를 **각 항목 옆에서 검증할 수 있는지**는 별도 연구문제입니다. ([Amazon News](https://www.aboutamazon.com/news/retail/amazon-ai-generated-review-highlights?utm_source=chatgpt.com))

우리의 차별점은:

Detail-page summary나 chat-only assistant가 아니라, visible result grid 위에 item-specific evidence를 직접 anchor한다.

### **Revamp와의 차이**

Revamp는 CHI 2021 논문으로, blind or low vision 사용자의 온라인 쇼핑 정보 탐색 문제를 다루고, customer reviews를 활용한 browser integration과 review-based QA를 제공했습니다. 평가에서는 8명의 BLV 사용자를 대상으로 제품 외형 이해와 핵심 정보 탐색에 도움이 됨을 보였습니다. ([PCG](https://pi.cs.tsinghua.edu.cn/publication/revamp-enhancing-accessible-information-seeking-experience-of-online-shopping-for-blind-or-low-vision-users/?utm_source=chatgpt.com))

우리의 차별점은 접근성 특화가 아니라, 일반 사용자 또는 특정 쇼핑/OTT 사용자에게서 **multi-item comparison**과 **in-place evidence comparison**을 연구한다는 점입니다.

### **Sentiment-embedded comparison interface와의 차이**

기존 e-commerce comparison 연구는 review sentiment를 comparison matrix, opinion table, opinion bar chart, opinion cloud 등에 넣어 제품 비교를 돕는 방법을 실험했습니다. 이 연구는 리뷰 정보를 비교 인터페이스에 통합하는 것이 구매자 의사결정에 도움이 될 수 있음을 보여줍니다. ([ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0950705114001099?utm_source=chatgpt.com))

우리의 차별점은 고정된 comparison table이 아니라, 사용자가 현재 보고 있는 grid에서 자연어로 여러 항목을 지정하고, AI가 **해당 카드 옆에 evidence overlay를 동적으로 생성**한다는 점입니다.

### **GUI agent / numbered overlay 연구와의 차이**

기존 numbered overlay나 GUI grounding 연구는 주로 “어떤 요소를 선택할 것인가”에 초점을 둡니다. 우리 프로젝트는 선택 이후, “선택한 여러 항목에 대해 어떤 정보를 어떻게 붙여줘야 사용자가 더 잘 비교하는가”로 문제를 확장합니다.

---

## **4\. 연구 질문을 이렇게 잡아야 함**

논문급으로는 질문을 3개 정도로 좁히는 게 좋습니다.

### **RQ1. 탐색 비용**

Does in-place AI evidence overlay reduce page switching and detail-page opening during multi-item comparison tasks?

측정 지표:

* number of page switches  
* number of opened detail pages  
* task completion time  
* number of compared items  
* backtracking count

이건 매우 강한 지표입니다. 기존 GUI에서는 사용자가 목록 → 상세 → 목록 → 상세를 반복합니다. In-place overlay가 이 비용을 줄이는지 직접 보여줄 수 있습니다.

### **RQ2. 정보-항목 매칭과 의사결정 품질**

Does spatially anchoring AI-generated evidence to visible items improve users’ ability to compare alternatives and justify their final choice?

측정 지표:

* final choice quality  
* justification quality  
* recall of product/movie attributes  
* item-evidence binding accuracy  
* confidence in final decision

여기서 중요한 건 “사용자가 좋은 상품을 골랐나?”뿐 아니라, **왜 골랐는지를 근거와 함께 설명할 수 있나**입니다.

### **RQ3. 신뢰와 검증 행동**

How does in-place evidence presentation affect trust, perceived control, and verification behavior compared with a chat-only assistant?

측정 지표:

* trust in AI summary  
* perceived control  
* verification clicks  
* evidence snippet expansion  
* reliance on incorrect or incomplete summaries  
* correction/repair behavior

이게 HAI contribution입니다. AI가 요약을 해주면 사용자는 편하지만, 틀린 요약을 과신할 수 있습니다. 따라서 summary 옆에 출처 review snippet, “why this?”, “show negative reviews”, “compare only battery complaints” 같은 검증 행동을 넣어야 합니다.

---

## **5\. 시스템은 “요약기”가 아니라 “비교 지원 인터페이스”여야 함**

논문급 시스템은 다음 기능을 갖추는 게 좋습니다.

### **핵심 기능**

1. **Dense result grid**  
   상품 12–20개 또는 영화/콘텐츠 12–20개가 있는 mock web GUI.  
2. **Multi-item selection**  
   사용자가 “2, 5, and the cheapest wireless one”, “the blue one and the one above it”처럼 번호·속성·상대 위치로 여러 항목을 선택.  
3. **In-place evidence overlay**  
   각 선택 항목 옆에 요약 bubble 표시.  
4. **Evidence provenance**  
   요약 아래에 “based on 12 reviews mentioning battery” 또는 review snippets 제공.  
5. **Comparison tray**  
   선택 항목들을 하단 비교 패널에 고정.  
6. **Feature-specific filtering**  
   “battery complaints only”, “negative reviews only”, “shipping issues only”, “runtime and mood only”.  
7. **Repair interaction**  
   “not that one”, “replace 3 with the one on the right”, “show more like 2”.  
8. **Risk/trust control**  
   AI가 추천 결론을 단정하지 않고, 근거를 보여주며 사용자가 최종 결정을 내리게 함.

---

## **6\. 데이터는 실제 크롤링보다 공개 데이터셋이 좋음**

Amazon/Coupang/Netflix를 직접 크롤링하면 법적·윤리적·재현성 문제가 생깁니다. 논문급으로 가려면 공개 데이터셋이나 synthetic-but-controlled dataset이 낫습니다.

Amazon Reviews 2023은 McAuley Lab에서 공개한 대규모 데이터셋으로, 571.54M reviews, item metadata, description, price, image metadata 등을 포함하고 May 1996부터 Sep 2023까지의 interaction을 담고 있습니다. 연구 프로토타입에는 이 중 작은 category subset만 쓰면 됩니다. ([Hugging Face](https://huggingface.co/datasets/McAuley-Lab/Amazon-Reviews-2023?utm_source=chatgpt.com))

OTT 쪽은 MovieLens를 사용할 수 있습니다. GroupLens는 MovieLens 32M을 new research에 추천하며, 32M ratings와 2M tag applications, 87,585 movies를 포함한다고 설명합니다. ([GroupLens](https://grouplens.org/datasets/movielens/?utm_source=chatgpt.com))

다만 나는 **쇼핑 도메인**을 추천합니다. 이유는 다음과 같습니다.

| 기준 | 쇼핑 | OTT |
| ----- | ----- | ----- |
| 비교 기준 | 가격, 평점, 리뷰, 스펙, 배송, 단점 | 장르, 시놉시스, mood, 러닝타임 |
| 객관적 평가 | 상대적으로 쉬움 | 취향 의존성이 큼 |
| page switching pain | 매우 명확함 | 비교적 약함 |
| evidence snippet | 리뷰 기반으로 강함 | 리뷰/태그 기반 가능하지만 주관적 |
| user study task | 명확함 | 다소 취향 기반 |

논문급으로는 “무선 이어폰/키보드/전기주전자/모니터”처럼 비교 기준이 분명한 상품 카테고리가 좋습니다.

---

## **7\. 실험 설계는 이 정도는 되어야 함**

수업 프로젝트는 8–16명으로 충분하지만, 1티어 논문을 목표로 하면 보통 더 강한 평가가 필요합니다. 정확한 기준은 venue와 연구 유형에 따라 다르지만, controlled within-subjects study라면 **N=36–48명 이상**을 목표로 잡는 게 안전합니다. 여기에 formative study나 qualitative interview를 추가하면 훨씬 강해집니다.

### **Study 1\. Formative study**

목적: 실제 사용자들이 dense result grid에서 어떻게 비교하고, 무엇을 귀찮아하는지 파악.

* 참가자: 12–18명  
* 방법: think-aloud shopping comparison task  
* 분석:  
  * page switching pattern  
  * comparison criteria  
  * memory failures  
  * item-evidence mismatch  
  * multi-item selection language taxonomy

결과물:

* “사용자는 몇 개 상품을 동시에 비교하는가”  
* “어떤 정보가 카드 위에 있으면 좋은가”  
* “어떤 상황에서 상세 페이지를 열어야 하는가”  
* “어떤 자연어 표현으로 여러 항목을 선택하는가”

### **Study 2\. Controlled experiment**

조건은 최소 3개가 좋습니다.

| Condition | 설명 |
| ----- | ----- |
| C1. Baseline detail-page browsing | 사용자가 목록에서 상품을 하나씩 열어보고 돌아옴 |
| C2. Chat-only AI assistant | AI가 별도 채팅 패널에서 선택한 상품들을 요약·비교 |
| C3. In-place AI evidence overlay | 각 상품 카드 옆에 요약·근거·비교 단서 표시 |
| C4. In-place overlay \+ repair/provenance | repair command와 review snippet expansion 포함 |

핵심 비교는 **C2 vs C3**입니다. 왜냐하면 둘 다 AI 요약을 제공하지만, 하나는 채팅창이고 하나는 카드에 직접 anchor됩니다. 여기서 차이가 나와야 논문이 됩니다.

### **Task 예시**

* “Choose the best wireless earbuds under $80 for commuting.”  
* “Find the keyboard with low noise and good typing feel.”  
* “Pick a product with few durability complaints.”  
* “Compare three similar products and justify your final choice.”  
* “Find which product has the strongest negative reviews about battery life.”

### **정량 지표**

* task completion time  
* number of page switches  
* number of opened detail pages  
* number of inspected reviews  
* final choice quality  
* justification quality  
* item-evidence binding accuracy  
* perceived control  
* trust in AI  
* workload  
* confidence calibration  
* verification behavior

### **정성 지표**

* “어떤 overlay가 도움이 되었는가”  
* “언제 AI 요약을 믿었는가”  
* “언제 원문 리뷰를 확인하고 싶었는가”  
* “chat-only와 in-place 중 무엇이 비교하기 쉬웠는가”  
* “카드 옆 요약이 방해가 된 순간은 언제인가”

---

## **8\. 논문 contribution은 이렇게 써야 함**

최종 논문이라면 contribution을 이렇게 구성하는 게 좋습니다.

### **Contribution 1 — Empirical understanding**

A formative study characterizing how users compare multiple similar items in dense web result grids, including page-switching behavior, evidence needs, and multi-item reference patterns.

### **Contribution 2 — Interaction technique**

GroundedCompare, an in-place AI evidence overlay technique that anchors item-specific review summaries, feature concerns, and comparison cues directly to selected items in a result grid.

### **Contribution 3 — Evaluation**

A controlled study comparing baseline browsing, chat-only AI assistance, and in-place evidence overlays, measuring navigation cost, decision quality, item-evidence binding, perceived control, trust, and workload.

### **Contribution 4 — Design implications**

Design implications for AI-assisted multi-item decision making, including when evidence should be anchored in-place, when a comparison tray is needed, and how provenance should be exposed to prevent overreliance.

이 정도면 CHI/IUI 쪽에서 읽을 만한 구조가 됩니다.

---

## **9\. 꼭 피해야 할 것**

### **1\. “AI 요약이 더 빠르다”만 주장하기**

AI 요약이 빠른 건 너무 당연하고 이미 제품화되어 있습니다. 중요한 건 **어디에, 어떤 형태로, 어떤 근거와 함께, 어떤 조작 방식으로 보여주는가**입니다.

### **2\. 실제 Amazon/Coupang UI를 그대로 복제하기**

저작권·브랜드·데이터 문제가 생길 수 있습니다. Mock e-commerce grid로 가는 게 안전합니다.

### **3\. LLM hallucination을 방치하기**

논문급에서는 AI summary가 틀릴 수 있다는 점을 설계에 반영해야 합니다. 추천 구조:

* summary마다 source review snippets 표시  
* “show evidence” 버튼  
* feature-specific count 표시  
* “AI may miss rare issues” 같은 uncertainty cue  
* final choice를 AI가 대신하지 않고 사용자가 하도록 설계

### **4\. 선택 결과만 보고 “좋다”고 주장하기**

사용자가 좋다고 말했다는 만족도만으로는 약합니다. page switching, detail opens, evidence recall, decision justification quality 같은 행동 지표가 필요합니다.

### **5\. 너무 넓은 도메인**

쇼핑 \+ OTT \+ 여행 \+ 논문 검색까지 다 하려 하면 망합니다. 논문급으로는 한 도메인에서 깊게 해야 합니다. 내 추천은 **e-commerce product comparison**입니다.

---

## **10\. 1티어 목표라면 최종 주제는 이렇게 좁히는 게 좋음**

### **추천 제목**

**GroundedCompare: In-Place AI Evidence Overlays for Multi-Item Product Comparison in Dense Web Result Grids**

### **추천 abstract-level claim**

Dense product result grids require users to repeatedly open detail pages, remember evidence across alternatives, and map review information back to visible items. We propose GroundedCompare, an AI-assisted interaction technique that lets users select multiple visible items using natural language, numbers, or attributes, and attaches evidence-backed micro-summaries directly to each selected item. Through a controlled study, we investigate whether in-place evidence overlays reduce navigation cost, improve item-evidence binding, and support calibrated trust compared with detail-page browsing and chat-only AI assistance.

### **논문급 novelty statement**

The novelty is not AI review summarization itself, but the spatial anchoring of AI-generated evidence to multiple visible candidates in a dense result grid, combined with multi-item natural-language selection, evidence provenance, and repair interaction.

---

## **11\. 수업 프로젝트에서 논문급으로 이어지는 현실적 로드맵**

### **이번 학기 목표**

* Mock shopping grid  
* Product metadata \+ review snippets  
* Multi-item selection: number / attribute / relative position  
* In-place evidence overlay  
* Comparison tray  
* Small study N=8–16

### **논문 확장 목표**

* Formative study N=12–18  
* Controlled experiment N=36–48  
* Public dataset 기반 reproducible task set  
* Chat-only vs in-place overlay 비교  
* Evidence provenance / no provenance ablation  
* Strong qualitative analysis  
* Design implications

---

## **최종 판단**

이 아이디어는 연구 가치가 있습니다. 다만 1티어를 노리려면 \*\*“AI가 정보를 요약한다”\*\*가 아니라 다음 문제로 정확히 좁혀야 합니다.

**비슷한 후보가 많이 보이는 웹 결과 그리드에서, 사용자가 여러 항목을 비교할 때 AI-generated evidence를 어디에 어떻게 제시해야 탐색 비용을 줄이고, 항목-근거 매칭을 개선하며, 과신 없이 판단을 도울 수 있는가?**

그 방향이면 CHI/IUI에 맞습니다. UIST를 노리려면 구현과 interaction technique의 novelty를 더 세게 만들어야 하고, CHI/IUI를 노리려면 사용자 연구와 design implications를 더 강하게 만들어야 합니다.

# Workload division

## **3\. Workload Division (4-Person)**

Timeline

–5/20 finish

5/20–5/28 user study

* **Member 1: Project Manager & Lead Researcher (1 person)**  
  * **Tasks:** Design the user study protocol, manage IRB/ethics (if needed), curate the task list (e.g., "Find the cheapest earbuds"), and handle the final analysis.  
  * amazon ui (\~5/12)  
* **Member 2: Frontend Architect (1 person:)**  
  * **Tasks:** Build the media/home-screen GUI, create the dynamic "Numbered Overlay" component, and implement the "Comparison Tray" for multi-item selection.  
* **Member 3: AI & Integration Engineer (2 people: Danilo &)**  
  * **Tasks:** Prompt engineering for element grounding, connecting the LLM to the backend, and implementing the "Repair" logic for ambiguous follow-ups.  
  * **Part 1:** Get prompt from user, send request to DB  
  * **Part 2:** Decide how to show on frontend  
* **Member 4: Data & Systems Engineer (1 person)**  
  * **Tasks:** Construct the **UI Element Registry**, set up the logging system to track user "page switches" and "completion times," and manage the dataset (like Amazon Reviews 2023).  
  * 5/12 Netflix DB(Supabase), API documentation deploy  
  * 5/(could be delayed) Amazon DB, API documentation deploy  
  * 

